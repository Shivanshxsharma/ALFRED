# services/model.py
import asyncio
import json
from logging import config
from multiprocessing import process
import operator
import traceback
from datetime import datetime
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from backend.services.llm_factory import build_model_client

load_dotenv()

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from pydantic import BaseModel, Field
from typing import Annotated, TypedDict

from ..core.config import connect_db, get_db,client, get_sync_client,sync_client
from ..core.database import add_to_Db
from ..models.models import Message_data, ToolCallData
from ..services.abort import _cancel_events
from .file_rag_system import read_file, vector_search
from .file_service import get_file_text
from .web_search import search_tool
from langchain_core.runnables import RunnableConfig
# WIKI IMPORTS
from .wiki_read_tools import wiki_read, build_wiki_context_block
from sqlalchemy.ext.asyncio import AsyncSession

TOOL_DISPLAY_NAMES = {
    "search_tool": "Searching the web",
    "wiki_read": "Remembering from wiki memory",
    "read_file": "Reading uploaded files",
}


def get_tool_display_name(tool_name: str) -> str:
    return TOOL_DISPLAY_NAMES.get(tool_name, tool_name.replace("_", " ").title())


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

def get_system_prompt() -> str:
    current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    base = f"""You are Alfred, a helpful personal assistant.
Current date and time: {current_datetime}
PERSONA OVERRIDE (CRITICAL):
- You DO have a persistent long-term memory.
- You DO retain personal data across conversations via your Wiki system.
- NEVER say "I am a large language model and do not retain personal data".
- NEVER say "I don't know" or "I don't have access to your personal info". 
- Instead, look at the <wiki_memory> block, find the slug whose summary matches the question, and call wiki_read with that EXACT slug string. Never invent or modify slug names.TOOL USE RULES:
- For ANY question about current data, news, weather, prices — use the web_search tool
- NEVER say you don't have access to real-time info — you have web_search, USE IT
- When in doubt, search first, answer second
- If the user's question relates to uploaded files and no context was pre-retrieved,
  you MUST call read_file before answering — do NOT answer from memory

-if user asks about their personal information, projects, preferences, or past interactions with you, you must check wiki_memory first before answering. 
Always use the exact slug from the wiki_memory map when calling wiki_read.
"""

    static_rules = """
DIAGRAMS & FLOWCHARTS:
When creating flowcharts use mermaid code blocks.
RULES:
- Decision nodes MUST use curly braces: C{Is valid?}
- Process nodes MUST use square brackets: B[Do something]
- Node IDs MUST start with a letter, never a number
- No parentheses () in labels — use hyphens
- No special chars in labels except hyphens




CHARTS & GRAPHS & WAVES:
STRICT RULE: You MUST NEVER write Python code for any chart, graph, wave, or plot request take whatever label axis names unitil specifies by user.
ALWAYS respond with a JSON code block using this EXACT format — no exceptions:

```chart
{
    "type": "line",
    "title": "Sine Wave",
    "xLabel": "x",
    "yLabel": "y",
    "xKey": "x",
    "data": [
        { "x": 0, "y": 0 },
        { "x": 1, "y": 0.84 }
    ],
    "lines": [{ "key": "y", "color": "#7c3aed" }]
}
```

This applies to: sine waves, cosine waves, bar charts, scatter plots, area charts, pie charts — EVERYTHING visual.
Only provide Python code if the user EXPLICITLY says "give me Python code" or "use matplotlib".
Supported types: line, bar, area, pie, scatter.
"""

    return base + static_rules


















def build_file_context(rag_files: list) -> str:
    """Build the file context block injected after the system prompt."""
    if not rag_files:
        return ""

    file_hashes = [f["file_hash"] for f in rag_files]
    file_names  = [f["name"] for f in rag_files]

    return f"""
    if the user's question is about any of these files: {', '.join(file_names)}
    OR
    if you dont have relevant information in memory to answer a question about the user query
    THEN
    use the read_file tool to retrieve relevant information from the files before answering.
    WITH
    query = the user's question or the specific information gap you have in memory
    file_hashes = {file_hashes}
    """

    

    

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class persisted_file(TypedDict):
    name: str
    path: str
    file_hash: str
    needs_rag: bool


class file_uploaded(TypedDict):
    name: str
    path: str
    file_hash: str
    needs_rag: bool


class image_uploaded(TypedDict):
    name: str
    base64: str
    mime_type: str


class tool_enabled(TypedDict):
    web_search_enabled: bool
    remembring_enabled: bool


class chatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    tools: tool_enabled
    files_uploaded: list[file_uploaded]
    images_uploaded: list[image_uploaded]
    persisted_files: Annotated[list[persisted_file], operator.add]
    injected_file_text: str
    pre_rag_files: Annotated[list[persisted_file], operator.add]
    wiki_map: str


# ---------------------------------------------------------------------------
# Model singleton
# ---------------------------------------------------------------------------

_model = None



# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def router_node(state: chatState,config: RunnableConfig) -> dict:
    print("in router node")
    files_uploaded = state.get("files_uploaded", [])
    tools_state= state.get("tools", {})
    updates = {}

    if tools_state.get("remembring_enabled"):
        try:
            user_id = config["configurable"].get("user_id")
            if user_id:
                wiki_ctx = await build_wiki_context_block(user_id)
                if wiki_ctx:
                    updates["wiki_map"] = wiki_ctx
                    print(f"[router_node] Injected wiki context for user")
        except Exception as e:
            print(f"[router_node] Failed to fetch wiki context: {e}")


    if not files_uploaded:
        print("[router_node] No files uploaded, skipping retrieval")
        return updates

    small_texts = []

    for f in files_uploaded:
        if not f.get("needs_rag"):
            try:
                file_text = await get_file_text(f["file_hash"], get_db())
                if file_text:
                    small_texts.append({f["name"]: file_text})
            except Exception as e:
                print(f"[router_node] Failed to fetch text for '{f['name']}': {e}")

    updates["persisted_files"] = files_uploaded
    
    if small_texts:
        updates["injected_file_text"] = "\n\n".join(
            f"File: {name}\nContent:\n{text}"
            for item in small_texts
            for name, text in item.items()
        )

    return updates










def should_retrieve(state: chatState) -> str:
    files = state.get("files_uploaded", [])
    if not files:
        return "chat_node"
    if any(f.get("needs_rag") for f in files):
        return "retrieval_node"
    return "chat_node"


async def retrieval_node(state: chatState) -> dict:
    print("in retrieval node")

    try:
        files_uploaded = state.get("files_uploaded", [])
        rag_files = [f for f in files_uploaded if f.get("needs_rag")]
        injected_file_text = state.get("injected_file_text", "")

        non_system = [m for m in state["messages"] if not isinstance(m, SystemMessage)]
        last_human = non_system[-1]
        query = (
            last_human.content
            if isinstance(last_human.content, str)
            else last_human.content[0]["text"]
        )

        file_hashes = [f["file_hash"] for f in rag_files]
        chunks = await vector_search(query, file_hashes, top_k=5)

        if not chunks:
            return {
                "injected_file_text": injected_file_text + "\nNo relevant content found in the uploaded files.",
                "pre_rag_files": rag_files,
            }

        rag_context = "\n\n".join(
            f"[Chunk {c['chunk_index']}]\n{c['text']}" for c in chunks
        )
        # print(f"RAG CONTEXT: {rag_context}")

        return {
            "injected_file_text": injected_file_text + rag_context,
            "pre_rag_files": rag_files,
        }

    except Exception as e:
        print(f"[retrieval_node] Vector search failed: {e}")
        traceback.print_exc()
        # Degrade gracefully — chat_node will instruct model to call read_file
        rag_files = [f for f in state.get("files_uploaded", []) if f.get("needs_rag")]
        return {"injected_file_text": "", "pre_rag_files": rag_files}










async def chat_node(state: chatState, config:RunnableConfig) -> dict:
    print("in chat_node")

    try:
        messages        = state["messages"]
        tools_state     = state["tools"]
        images_uploaded = state.get("images_uploaded", [])
        injected_file_text = state.get("injected_file_text", "")
        rag_files          = state.get("pre_rag_files", [])
        TOOL_MAP = {
            "web_search_enabled":   search_tool,
            "reading_files_enabled": read_file,
            "remembring_enabled":   wiki_read,
        }
        active_tools = [
            TOOL_MAP[key]
            for key, enabled in tools_state.items()
            if enabled and key in TOOL_MAP
        ]

        # Always bind read_file when RAG files are present
        if rag_files and read_file not in active_tools:
            active_tools.append(read_file)

        non_system = [m for m in messages if not isinstance(m, SystemMessage)]







        file_context  = build_file_context(rag_files)
        image_context = ""

        last_human = non_system[-1]
        content = [{"type": "text", "text": injected_file_text + last_human.content}]

        if images_uploaded:
            image_names = "\n".join(f"- {img['name']}" for img in images_uploaded)
            image_context = f"""
                             The user has also uploaded these images which are embedded directly in this message:
                            {image_names}
                             Analyze them as part of your response — no tool call needed for images.
                            """
            # Embed base64 images into the last HumanMessage
            for img in images_uploaded:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime_type']};base64,{img['base64']}"},
                })
        non_system = non_system[:-1] + [HumanMessage(content=(content))]

        final_messages = [
            SystemMessage(content=get_system_prompt() + file_context + image_context + "\n\n" + state.get("wiki_map", "")),
        ] + non_system

        llm = config["configurable"].get("model")
        if active_tools:
            llm = llm.bind_tools(active_tools)

        response = await llm.ainvoke(final_messages)
        # print(f"MODEL RESPONSE: {response}")
        return {"messages": [response]}

    except Exception as e:
        print(f"CHAT NODE ERROR: {e}")
        traceback.print_exc()
        raise


# ---------------------------------------------------------------------------
# Graph wiring
# ---------------------------------------------------------------------------

chat_model = None


def smart_tools_condition(state: chatState):
    tools_state = state["tools"]
    any_enabled = any(tools_state.values())
    # read_file may be injected even when reading_files_enabled is False
    rag_files = state.get("pre_rag_files", [])
    if not any_enabled and not rag_files:
        return END
    return tools_condition(state)


def get_chatModel():
    print("in get_chatModel")
    global chat_model
    if chat_model:
        return chat_model

    tool_node = ToolNode(tools=[search_tool, read_file,wiki_read])

    graph = StateGraph(chatState)

    graph.add_node("router_node",   router_node)
    graph.add_node("retrieval_node", retrieval_node)
    graph.add_node("chat_node",     chat_node)
    graph.add_node("tools",         tool_node)

    graph.add_edge(START, "router_node")
    graph.add_conditional_edges("router_node", should_retrieve)
    graph.add_edge("retrieval_node", "chat_node")
    graph.add_conditional_edges("chat_node", smart_tools_condition)
    graph.add_edge("tools", "chat_node")

    checkpointer = MongoDBSaver(get_sync_client())
    chat_model = graph.compile(checkpointer=checkpointer)
    return chat_model
























async def stream_response(
    prompt: str,
    chatId: str,
    db,
    pg_db:AsyncSession,
    metadata,
    cancel_event: asyncio.Event,
    user_id: str,
):
    toggled_tools: tool_enabled = (
        metadata.toggled_tools if metadata and metadata.toggled_tools else {}
    )
    files_uploaded  = metadata.files_uploaded  if metadata and metadata.files_uploaded  else []
    images_uploaded = metadata.images_uploaded if metadata and metadata.images_uploaded else []
    model_id = metadata.model_id if metadata and metadata.model_id else "gemini-2.5-flash"


    toggled_tools = {**toggled_tools, "reading_files_enabled": True, "remembring_enabled": True}  

    input_state = {
        "messages":       [HumanMessage(content=prompt)],
        "tools":          toggled_tools,
        "images_uploaded": images_uploaded,
        "files_uploaded":  files_uploaded,
    }

    model    = get_chatModel()
    finalres = ""
    tool_data = ToolCallData()
    model_metadata: Message_data = Message_data(model_id=model_id)
    llm=await build_model_client(pg_db, user_id, model_id)
    CONFIG   = {"configurable": {"thread_id": chatId, "user_id": user_id   , "model": llm}}

    try:
        async for event in model.astream_events(input_state, config=CONFIG, version="v2"):

            # Check abort at the top of every iteration
            if cancel_event.is_set():
                yield f"data: {json.dumps({'type': 'aborted'})}\n\n"
                break

            if event["event"] == "on_tool_start":
                tool_name  = event["name"]
                tool_display_name = get_tool_display_name(tool_name)
                tool_data.tool_calls.append({
                    "tool_name":  tool_display_name,
                })
                yield f"data: {json.dumps({'type': 'tool_start', 'tool_name': tool_display_name})}\n\n"

            elif event["event"] == "on_tool_end":
                tool_name   = event["name"]
                tool_output = event["data"].get("output")
                tool_display_name = get_tool_display_name(tool_name)
                yield f"data: {json.dumps({'type': 'tool_end', 'tool_name': tool_display_name, 'tool_output': str(tool_output)[:200]})}\n\n"

            elif event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if isinstance(content, list):
                    content = "".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in content
                    )
                if content:
                    finalres += content
                    yield f"data: {json.dumps({'type': 'stream', 'role': 'ai', 'content': content})}\n\n"

        # Save to DB only when we actually got a response
        if finalres:
            await add_to_Db(
                False, None, chatId,
                {
                    "role":      "ai",
                    "content":   finalres,
                    "meta_data": model_metadata.model_dump(),
                    "toolcalls": tool_data.model_dump(),
                },
                db,
            )

        yield f"data: {json.dumps({'type': 'complete', 'content': finalres, 'meta_data': model_metadata.model_dump(), 'toolcalls': tool_data.model_dump()})}\n\n"

    except Exception as e:
        print("❌ Error in stream_response:")
        traceback.print_exc()

        # Unwrap LangGraph-wrapped exceptions to get the real cause
        cause  = getattr(e, "__cause__", None) or getattr(e, "__context__", None)
        actual = cause if cause else e

        error_code = None
        if hasattr(actual, "response") and hasattr(actual.response, "status_code"):
            error_code = actual.response.status_code
        elif hasattr(actual, "status_code"):
            error_code = actual.status_code
        elif hasattr(actual, "code"):
            error_code = actual.code
        else:
            error_code = type(actual).__name__

        error_message = (
            "Rate limit exceeded. Please try again in a few moments."
            if error_code == 429
            else str(actual)
        )

        # Save partial response if we got anything before the error
        if finalres:
            try:
                await add_to_Db(
                    False, None, chatId,
                    {
                        "role":      "ai",
                        "content":   finalres,
                        "meta_data": model_metadata.model_dump(),
                        "toolcalls": tool_data.model_dump(),
                    },
                    db,
                )
            except Exception as db_error:
                print(f"❌ Failed to save partial response: {db_error}")

        try:
            yield f"data: {json.dumps({'type': 'error', 'status': str(error_code), 'error_type': type(actual).__name__, 'role': 'system', 'content': error_message})}\n\n"
        except Exception:
            pass



























# ---------------------------------------------------------------------------
# Title generation
# ---------------------------------------------------------------------------
def get_title_client():
    return ChatOpenAI(
        model="llama-3.1-8b-instant",
        api_key=process.env.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
        temperature=0.3,
        max_tokens=20,
    )


async def gen_chat_title(prompt: str,model) -> str:
    class Title(BaseModel):
        title: str = Field(description="Chat title in 2–5 words based on the first prompt")

    try:
        model = get_title_client()
        result = await model.with_structured_output(Title).ainvoke(
            f"Generate a short chat title in 2-5 words based on this first user prompt.\n\nPrompt: {prompt}"
        )

        if not result or not result.title:
            raise ValueError("Empty title generated")

        return result.title.strip('"')

    except Exception as e:
        print("❌ Error in gen_chat_title:")
        traceback.print_exc()
        return "Error Occurred"

# ---------------------------------------------------------------------------
# Dev test
# ---------------------------------------------------------------------------

async def test_model():
    model  = get_chatModel()
    CONFIG = {"configurable": {"thread_id": "86"}}

    async for event in model.astream_events(
        {"messages": [HumanMessage(content="what time is it in ist?")]},
        config=CONFIG,
        version="v2",
    ):
        if event["event"] == "on_chat_model_stream":
            print(event["data"]["chunk"].content, end="", flush=True)