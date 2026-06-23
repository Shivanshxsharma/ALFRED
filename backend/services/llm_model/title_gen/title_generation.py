from multiprocessing import process
import traceback

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

load_dotenv()  # usually called once at app startup, not per-file

api_key = os.getenv("GOOGLE_API_KEY")
def get_title_client():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",  
        temperature=0,
        api_key=api_key,
        timeout=10,
        max_retries=1,
    )


async def gen_chat_title(prompt: str) -> str:
    class Title(BaseModel):
        title: str = Field(description="Chat title in 2–5 words based on the first prompt")

    try:
        model = get_title_client()
        result = await model.with_structured_output(Title).ainvoke(
            f"Generate a short chat title in 2-5 words based on this first user prompt.\n\nPrompt: {prompt}"
        )

        print(result)

        if not result or not result.title:
            raise ValueError("Empty title generated")
        

        return result.title.strip('"')

    except Exception as e:
        print("❌ Error in gen_chat_title:")
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

        if error_code == 429:
            print("❌ Rate limit hit during title generation")
            return "Rate Limit Exceeded"

        return "New Chat"
