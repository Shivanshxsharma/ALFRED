import os
import asyncio
from langchain_core.tools import tool
from markitdown import MarkItDown
from backend.core.config import get_db
from backend.services.file_service import CHUNKS_COLLECTION
from backend.services.model import embeddings_model, ATLAS_VECTOR_INDEX

md_converter = MarkItDown()  # initialize once, reuse

async def vector_search(
    query: str,
    file_hashes: list[str],
    db,
    top_k: int = 5
) -> list[dict]:
    """
    Embeds query and searches Atlas Vector Search for relevant chunks.
    
    Args:
        query:       user's current message
        file_hashes: list of file hashes to scope the search
        db:          MongoDB database instance
        top_k:       number of chunks to return
    """

    # fix — asyncio.to_thread instead of get_event_loop
    query_embedding = await asyncio.to_thread(
        embeddings_model.embed_query,
        query
    )

    pipeline = [
        {
            "$vectorSearch": {
                "index": ATLAS_VECTOR_INDEX,
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,
                "limit": top_k,
                "filter": {
                    "file_hash": {"$in": file_hashes}
                }
            }
        },
        {
            "$project": {
                "text": 1,
                "chunk_index": 1,
                "file_hash": 1,
                "score": {"$meta": "vectorSearchScore"},
                "_id": 0
            }
        }
    ]

    cursor = db[CHUNKS_COLLECTION].aggregate(pipeline)
    results = await cursor.to_list(length=top_k)

    print(f"[vector_search] Retrieved {len(results)} chunks for query: {query[:50]}")
    return results






@tool
async def read_file(query: str, file_hashes: list[str]) -> str:
    """
    Search for more relevant content from previously uploaded files.
    Call this ONLY when the provided context chunks are insufficient to answer the question.
    
    Args:
        query:       your specific search question
        file_hashes: list of file hashes of the uploaded files
    """
    db = get_db()
    chunks = await vector_search(query, file_hashes, db, top_k=5)
    
    if not chunks:
        return "No additional relevant content found in the uploaded files."
    
    return "\n\n".join(
        f"[Chunk {c['chunk_index']}]\n{c['text']}"
        for c in chunks
    )