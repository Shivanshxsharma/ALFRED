from langchain_tavily import TavilySearch
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_community.tools  import DuckDuckGoSearchRun
from langchain_core.tools import tool
from datetime import datetime
import requests


from dotenv import load_dotenv
load_dotenv()

import os
print("API KEY:", os.getenv("TAVILY_API_KEY"))
@tool
def search_tool(query: str) -> str:
    """Search the web for latest and real-time information."""

    tavily = TavilySearch(
        max_results=5,
        search_depth="advanced",
        include_answer=True
    )

    try:
        response = tavily.invoke({"query": query})

        output = []

        if response.get("answer"):
            output.append(f"Answer: {response['answer']}\n")

        for r in response.get("results", []):
            output.append(
                f"Title: {r.get('title')}\n"
                f"Source: {r.get('url')}\n"
                f"Content: {r.get('content')}\n"
            )

        return "\n\n".join(output)

    except Exception as e:
        return f"Error in search_tool: {str(e)}"