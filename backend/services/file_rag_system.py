import os
import asyncio
from langchain_core.tools import tool
from backend.services.file_service import embeddings_model, pinecone_index

async def vector_search(
    query: str,
    file_hashes: list[str],
    top_k: int = 5
) -> list[dict]:
    # embed query
    query_embedding = await asyncio.to_thread(
        embeddings_model.embed_query,
        query
    )

    # query Pinecone with file_hash filter
    results = await asyncio.to_thread(
        lambda: pinecone_index.query(
            vector=query_embedding,
            top_k=top_k,
            filter={"file_hash": {"$in": file_hashes}},
            include_metadata=True
        )
    )

    chunks = [
        {
            "text": match["metadata"]["text"],
            "chunk_index": match["metadata"]["chunk_index"],
            "file_hash": match["metadata"]["file_hash"],
            "score": match["score"],
        }
        for match in results["matches"]
    ]

    print(f"[vector_search] Retrieved {len(chunks)} chunks for query: {query[:50]}")
    return chunks


@tool
async def read_file(query: str, file_hashes: list[str]) -> str:
    """
    Retrieve relevant content from the user's uploaded files using semantic search.
    
    You MUST call this tool if:
    - The user asks anything about their uploaded documents or files
    - No file context has been provided yet for this query
    - The provided context is incomplete or insufficient
    
    Do NOT answer questions about file contents from memory alone.
    
    Args:
        query:       focused search string matching what the user wants to find
        file_hashes: list of file hashes identifying which files to search
    """
    print(f"[read_file] Called with query: {query[:50]} and file_hashes: {file_hashes}")
    chunks = await vector_search(query, file_hashes, top_k=5)

    print (f"[read_file] Returning {len(chunks)} chunks as context.")
    if not chunks:
        return "No additional relevant content found in the uploaded files."
    

    return "\n\n".join(
        f"[Chunk {c['chunk_index']}]\n{c['text']}"
        for c in chunks
    )