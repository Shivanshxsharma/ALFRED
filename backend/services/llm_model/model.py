# services/model.py
import asyncio
import json
from logging import config
from multiprocessing import process
import operator
import os
import traceback
from datetime import datetime
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from backend.services.formmaters import build_final_messages, normalize_ai_message
from backend.services.formmaters import normalize_ai_message
from backend.services.llm_model.llm_factory import build_model_client

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

from ...core.config import connect_db, get_db,client, get_sync_client,sync_client
from ...core.database import add_to_Db
from ...models.models import Message_data, ToolCallData
from ..abort.abort import _cancel_events
from ..tools.file_rag_system import read_file, vector_search
from ..files.file_service import get_file_text
from ..tools.web_search import search_tool
from langchain_core.runnables import RunnableConfig
# WIKI IMPORTS
from ..wiki_memory.wiki_read_tools import wiki_read, build_wiki_context_block
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

def get_system_prompt(is_guest: bool) -> str:
    current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if is_guest:
        base = f"""You are Alfred, a helpful personal assistant.
Current date and time: {current_datetime}
You are in guest demo mode — 

You have only web search and a limited set of models available. You do not have memory, file access int this mode:
You do not have memory, file access int this mode:
"""
        return base 


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
NEVER mention chunk numbers, file_hashes, slugs, retrieval mechanics, or tool names in your response to the user — answer naturally as if you simply knew the information.
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
FILE CONTEXT AVAILABLE:
The user has uploaded: {', '.join(file_names)}.

Before answering, check: has this exact topic/question already been answered using retrieved 
content earlier in this conversation? 

- If YES — answer directly from that previously retrieved content. Do not call read_file again.
- If NO — or if this question asks about something not yet covered, call read_file with:
    query = the user's current question
    file_hashes = {file_hashes}
NEVER mention chunk numbers, file_hashes, slugs, retrieval mechanics, or tool names in your response to the user — answer naturally as if you simply knew the information.
Never answer a file-related question from guesswork. If you're unsure whether prior retrieved 
content covers this question, call read_file rather than assume.
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
    is_guest: bool


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










async def chat_node(state: chatState, config: RunnableConfig) -> dict:
    print("in chat_node")
 
    try:
        messages        = state["messages"]
        tools_state     = state["tools"]
        images_uploaded = state.get("images_uploaded", [])
        injected_file_text = state.get("injected_file_text", "")
        rag_files          = state.get("pre_rag_files", [])
 
        is_guest = state.get("is_guest", False)
        TOOL_MAP = {
            "web_search_enabled":    search_tool,
            "reading_files_enabled": read_file,
            "remembring_enabled":    wiki_read,
        }
        active_tools = [
            TOOL_MAP[key]
            for key, enabled in tools_state.items()
            if enabled and key in TOOL_MAP
        ]

        
 
        if rag_files and read_file not in active_tools:
            active_tools.append(read_file)
 
        file_context = build_file_context(rag_files)

        wiki_map = state.get("wiki_map", "")
 
        final_messages, image_context = build_final_messages(
            messages=messages,
            system_prompt="", 
            injected_file_text=injected_file_text,
            images_uploaded=images_uploaded,
        )

        
        full_system_prompt = (
            get_system_prompt(is_guest) + ((file_context + image_context + "\n\n" + wiki_map) if is_guest else "")
        )
        final_messages[0] = SystemMessage(content=full_system_prompt)
 

        llm = config["configurable"].get("model")
        if active_tools:
            llm = llm.bind_tools(active_tools)
 
        response = await llm.ainvoke(final_messages)

        response = normalize_ai_message(response)
 
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
    pg_db: AsyncSession,
    metadata,
    cancel_event: asyncio.Event,
    user_id: str,
    is_guest: bool = False,
):
    toggled_tools: tool_enabled = (
        metadata.toggled_tools if metadata and metadata.toggled_tools else {}
    )

    files_uploaded  = metadata.files_uploaded  if metadata and metadata.files_uploaded  else []
    images_uploaded = metadata.images_uploaded if metadata and metadata.images_uploaded else []

    model_id = metadata.model_id if metadata and metadata.model_id else "gemini-2.5-flash"

    if is_guest:
        toggled_tools = {
            "reading_files_enabled": False,
            "remembring_enabled":    False,
            "web_search_enabled":    True,
        }
        files_uploaded = []
    else:
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

    if is_guest:
       llm = await build_model_client(pg_db, user_id, model_id, is_guest=True)
    else:
        llm = await build_model_client(pg_db, user_id, model_id, is_guest=False)

    CONFIG = {"configurable": {"thread_id": chatId, "user_id": user_id, "model": llm}}

    try:
        async for event in model.astream_events(input_state, config=CONFIG, version="v2"):

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

        if finalres and not is_guest:
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

        if finalres and not is_guest:
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