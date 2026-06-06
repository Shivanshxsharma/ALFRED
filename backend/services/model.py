# services/model.py
import asyncio
import json
from dotenv import load_dotenv
from langchain_core import messages
from langgraph.prebuilt import ToolNode, tools_condition
load_dotenv()  
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph,START,END
from pydantic import BaseModel,Field
from langgraph.graph.message import add_messages
from typing import TypedDict,Annotated
from langchain_core.messages import BaseMessage,HumanMessage,SystemMessage
from langgraph.checkpoint.mongodb import MongoDBSaver 
from ..core.config import connect_db,get_db
from fastapi import HTTPException
from ..core.database  import add_to_Db

from langchain_core.tools import tool
from .web_search import search_tool
from .file_rag_system import read_file
from datetime import datetime
import traceback
import json
from datetime import datetime
from ..models.models import Message_data
from ..services.abort import _cancel_events

def get_system_prompt():
    current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # f-string only for dynamic parts
    base = f"""You are a helpful assistant with web search access.

current date and time: {current_datetime}

IMPORTANT RULES:
- For ANY question about current data, news, weather, prices — you MUST use the web_search tool
- NEVER say you don't have access to real-time info — you have web_search, USE IT
- When in doubt, search first, answer second
"""

    # plain string for anything with { } — no f-string
    static_rules = """
DIAGRAMS & FLOWCHARTS:
When creating flowcharts use mermaid code blocks.
RULES:
- Decision nodes MUST use curly braces: C{Is valid?}
- Process nodes MUST use square brackets: B[Do something]
- Node IDs MUST start with a letter, never a number
- No parentheses () in labels — use hyphens
- No special chars in labels except hyphens

CHARTS & GRAPHS:
When asked to plot data or create a chart/graph, respond with a JSON code block:
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
Supported types: line, bar, area, pie, scatter
For multiple series include multiple keys in lines/bars array.
"""

    return base + static_rules


class tool_enabled(TypedDict):
    web_search_enabled:bool
    file_read_enabled:bool

class file_uploaded(TypedDict):
    name:str
    path:str
class image_uploaded(TypedDict):
    name:str
    base64:str
    mime_type:str


class chatState(TypedDict):
    messages:Annotated[list[BaseMessage],add_messages] 
    tools:tool_enabled
    files_uploaded:list[file_uploaded]
    images_uploaded:list[image_uploaded]




_model = None

def get_model():
    global _model
    if _model is None:
        _model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.5,
            streaming=True
        )

        
        _model = _model
    return _model







async def chat_node(state: chatState):
    messages = state["messages"]
    tools_state = state.get("tools", {})
    files_uploaded = state.get("files_uploaded", [])
    images_uploaded = state.get("images_uploaded", [])

    TOOL_MAP = {
        "web_search_enabled": search_tool,
    }
    
    active_tools = [TOOL_MAP[key] for key, enabled in tools_state.items() if enabled and key in TOOL_MAP]
    if files_uploaded:
        active_tools.append(read_file)

    non_system = [m for m in messages if not isinstance(m, SystemMessage)]
    
    # file context
    file_context = ""
    if files_uploaded:
        file_list = "\n".join(f"- {f['name']} at path {f['path']}" for f in files_uploaded)
        print(f"FILES: {file_list}")
        file_context = f"""

CRITICAL: The user has uploaded these files:
{file_list}
You MUST call the read_file tool with the EXACT path shown above before answering ANY question about the file contents. Do NOT say you cannot access files. The read_file tool gives you direct access.
"""

    # image context
    image_context = ""
    if images_uploaded:
        image_names = "\n".join(f"- {img['name']}" for img in images_uploaded)
        print(f"IMAGES: {image_names}")
        image_context = f"""

The user has also uploaded these images which are embedded directly in this message:
{image_names}
Analyze them as part of your response — no tool call needed for images.
"""

    final_messages = [SystemMessage(content=get_system_prompt() + file_context + image_context)]

    
    if images_uploaded:
        
        last_human = non_system[-1]

        content = [{ "type": "text", "text": last_human.content }]

        for img in images_uploaded:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{img['mime_type']};base64,{img['base64']}"
                }
            })

        
        non_system = non_system[:-1] + [HumanMessage(content=content)]

    final_messages = final_messages + non_system

    llm = get_model()
    if active_tools:
        llm = llm.bind_tools(active_tools)

    response = await llm.ainvoke(final_messages)
    return {"messages": [response]}







chat_model=None








def smart_tools_condition(state: chatState):
    tools_state = state.get("tools") or {}
    any_enabled = any(tools_state.values())
    
    if not any_enabled:
        return END
    return tools_condition(state)



def get_chatModel():
    global chat_model
    if(chat_model):
     return chat_model
    else:
     tools=[search_tool,read_file]
     tool_node = ToolNode(tools=tools)

     graph=StateGraph(chatState)

     graph.add_node("chat_node",chat_node)
     graph.add_node("tools",tool_node)



     graph.add_edge(START,"chat_node")
     graph.add_conditional_edges("chat_node",smart_tools_condition)
     graph.add_edge("tools","chat_node")
    #  graph.add_edge("chat_node",END)
     checkpointer= MongoDBSaver(get_db())
     chat_model=graph.compile(checkpointer=checkpointer)
     return chat_model






async def stream_response(prompt, chatId, db,metadata, cancel_event: asyncio.Event ):
    
    
    toggled_tools:tool_enabled = metadata.toggled_tools if metadata and metadata.toggled_tools else {}
    files_uploaded = metadata.files_uploaded if metadata and metadata.files_uploaded else []
    images_uploaded = metadata.images_uploaded if metadata and metadata.images_uploaded else []

    if len(files_uploaded) > 0:
     toggled_tools = {**toggled_tools, "file_read_enabled": True}
 
    model = get_chatModel()
    finalres = ""
    tool_data = Message_data()
    CONFIG = {'configurable': {"thread_id": chatId}}
    
    try:
        async for event in model.astream_events(
            {"messages": [HumanMessage(content=prompt)], "tools": toggled_tools, "files_uploaded": files_uploaded , "images_uploaded": images_uploaded},
            config=CONFIG,
            version="v2",
        ):
            
            print(event["event"], event.get("name"))  # add this temporarily
            if event["event"] == "on_tool_start":
                tool_name = event["name"]
                tool_input = event["data"].get("input")
                tool_data.tool_calls.append({
                    "tool_name": tool_name,
                    "tool_input": tool_input,
                    "start_time": datetime.now().isoformat()
                })
                yield f"data: {json.dumps({'type': 'tool_start', 'tool_name': tool_name, 'tool_input': tool_input})}\n\n"
             


            if event["event"] == "on_tool_end":
                tool_name = event["name"]
                tool_output = event["data"].get("output")
                yield f"data: {json.dumps({'type': 'tool_end', 'tool_name': tool_name, 'tool_output': str(tool_output)[:200]})}\n\n"

            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                print(f"RAW CHUNK CONTENT: {repr(content)}") 
                if isinstance(content, list):
                    content = "".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in content
                    )
                if content:
                    finalres += content
                    yield f"data: {json.dumps({'type': 'stream', 'role': 'ai', 'content': content})}\n\n"




                    
                if cancel_event.is_set():
                 yield f"data: {json.dumps({'type': 'aborted'})}\n\n"
                 break


        # save to DB only if we got a response
        if finalres:
            await add_to_Db(
                False, None, chatId,
                {
                    "role": "ai",
                    "content": finalres,
                    "meta_data": tool_data.model_dump()
                },
                db
            )

        yield f"data: {json.dumps({'type': 'complete', 'content': finalres, 'meta_data': tool_data.model_dump()})}\n\n"

    except Exception as e:
        print(f"❌ Error in stream_response:")
        traceback.print_exc()

        error_code = None
        error_message = str(e)

        if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
            error_code = e.response.status_code
        elif hasattr(e, 'status_code'):
            error_code = e.status_code
        elif hasattr(e, 'code'):
            error_code = e.code
        else:
            error_code = type(e).__name__

        if error_code == 429:
            error_message = "Rate limit exceeded. Please try again in a few moments."

        # save partial response if we got something before the error
        if finalres:
            try:
                await add_to_Db(
                    False, None, chatId,
                    {
                        "role": "ai",
                        "content": finalres,
                        "meta_data": tool_data.model_dump()
                    },
                    db
                )
            except Exception as db_error:
                print(f"❌ Failed to save partial response: {db_error}")

        try:
            yield f"data: {json.dumps({'type': 'error', 'status': str(error_code), 'error_type': type(e).__name__, 'role': 'system', 'content': error_message})}\n\n"
        except Exception:
            pass


async def gen_chat_title(prompt):
    class Title(BaseModel):
        title: str = Field(
            description="The title of chat according to the first prompt in 2-5 words"
        )

    try:
        model = get_model()

        title_of_chat = await model.with_structured_output(
            Title
        ).ainvoke(
            f"""
            Generate a short chat title in 2-5 words 
            based on this first user prompt.

            Prompt: {prompt}
            """
        )

        if not title_of_chat or not title_of_chat.title:
            raise ValueError("Empty title generated")

        return title_of_chat.title.strip('"')  # remove extra quotes if any

    except Exception as e:
        print("❌ Error in gen_chat_title:")
        traceback.print_exc()

        error_code = None
        error_message = str(e)

        if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
            error_code = e.response.status_code
        elif hasattr(e, 'status_code'):
            error_code = e.status_code
        elif hasattr(e, 'code'):
            error_code = e.code
        else:
            error_code = type(e).__name__

        if error_code == 429:
            error_message = "Rate limit exceeded while generating title."

        return {
            "type": "title_error",
            "status": str(error_code) ,
            "error_type": type(e).__name__,
            "content": error_message,
            "title": "New Chat"
        }



















































async def test_model():

  
   model=get_chatModel()
   CONFIG={'configurable':{"thread_id":"86"}}
   async for event  in model.astream_events(
         {"messages": [HumanMessage(content="what time is it in ist ?")]},
         config=CONFIG,
         version="v1",
      ):
         if event["event"] == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            print(content)








