import os
import asyncio
from langchain_core.tools import tool
from markitdown import MarkItDown

md_converter = MarkItDown()  # initialize once, reuse

def extract_text(path: str) -> str:
    print(f"Extracting text from file: {path}")
    ext = path.split(".")[-1].lower()
    
    if ext in ("pdf", "docx", "doc", "pptx", "xlsx"):
        result = md_converter.convert(path)
        return result.text_content
    
    elif ext in ("txt", "md"):
        with open(path) as f:
            return f.read()
    
    return ""

MAX_DIRECT_CHARS = 5000  # was 5 — bug fix

@tool
async def read_file(path: str, query: str) -> str:
    """Read a file and return relevant content based on the query.
    Use this when the user has attached a file and asks questions about it.
    
    Args:
        path: the server path of the uploaded file
        query: the user's question, used to retrieve relevant chunks for large files
    """
    print(f"CWD: {os.getcwd()}")
    print(f"EXISTS: {os.path.exists(path)}")
    
    if not os.path.exists(path):
        return f"File not found: {path}"
    
    # run in thread pool — non-blocking
    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(None, extract_text, path)

    if len(text) <= MAX_DIRECT_CHARS:
        return text
    
    else:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import FAISS
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(text)

        embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-2-preview")
        vectorstore = FAISS.from_texts(chunks, embeddings)

        relevant_chunks = vectorstore.similarity_search(query, k=3)
        return "\n\n".join(chunk.page_content for chunk in relevant_chunks)