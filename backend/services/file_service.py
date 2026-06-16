
import datetime
import hashlib
from markitdown import MarkItDown
import asyncio
import os
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pinecone import Pinecone

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))


def compute_hash(content):
    file_hash = hashlib.md5(content).hexdigest()
    return file_hash



async def check_duplicate(file,file_hash, db, user_id):
    existing = await db.files.find_one({"file_hash": file_hash, "user_id": user_id})
    if existing:
        return {
            "name": file.filename,
            "path": existing["path"],
            "file_hash": file_hash,
            "needs_rag": existing["needs_rag"],
            "char_count": existing["char_count"]
        }
    else :
        return None


md_converter = MarkItDown()  


def extract_text(path: str) -> str:
    print(f"Extracting text from file: {path}")
    ext = path.split(".")[-1].lower()
    
    if ext in ("pdf", "docx", "doc", "pptx", "xlsx"):
        result = md_converter.convert(path)
        print( "checkup-------------------------------------------" + result.text_content[:3000]) 
        return result.text_content
    
    elif ext in ("txt", "md"):
        with open(path) as f:
            return f.read()
    
    return ""



async def store_file_doc(file_hash, file, path, user_id, needs_rag, char_count, text, db):
    file_doc = {
        "file_hash": file_hash,
        "name": file.filename,
        "path": path,
        "user_id": user_id,
        "needs_rag": needs_rag,
        "char_count": char_count,
        "full_text": text if not needs_rag else None,
        "embedding_status": "pending" if needs_rag else "not_needed",
        "created_at": datetime.now()
    }
    await db.files.insert_one(file_doc)
    _cache[file_hash] = text if not needs_rag else None  # cache non-RAG texts for quick retrieval






CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
EMBEDDING_MODEL = "gemini-embedding-2-preview"
CHUNKS_COLLECTION = "file_chunks"           
ATLAS_VECTOR_INDEX = "file_chunks_index"   
embeddings_model = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL , max_retries=1)
BATCH_SIZE = 20
_cache: dict[str, str] = {}  


















async def embed_and_index(
    path: str,
    file_hash: str,
    text: str,
    db,
) -> None:
    try:
        print(f"[embed_and_index] Starting indexing for {path}")

        # ── 1. re-upload guard ──────────────────────────────────────────────
        fetch_result = await asyncio.to_thread(
            lambda: pinecone_index.fetch(ids=[f"{file_hash}_0"])
        )
        if fetch_result.vectors:
            print(f"[embed_and_index] Already indexed in Pinecone: {file_hash}, skipping")
            await db.files.update_one(
                {"file_hash": file_hash},
                {"$set": {"embedding_status": "indexed"}}
            )
            return

        # ── 2. chunk ────────────────────────────────────────────────────────
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        chunks = splitter.split_text(text)
        total = len(chunks)
        print(f"[embed_and_index] {total} chunks created")

        # ── 3. embed sequentially in batches ────────────────────────────────
        all_embeddings = []

        for i in range(0, total, BATCH_SIZE):
            batch = chunks[i : i + BATCH_SIZE]

            # sync embed_documents moved to worker thread
            # event loop stays free to serve other requests while this runs
            batch_embeddings = await asyncio.to_thread(
                embeddings_model.embed_documents,
                batch
            )
            all_embeddings.extend(batch_embeddings)
            print(f"[embed_and_index] {min(i + BATCH_SIZE, total)}/{total} chunks embedded")

# ── 4. build vectors for Pinecone ──────────────────────────────────────
        vectors = [
        {
        "id": f"{file_hash}_{idx}",
        "values": embedding,
        "metadata": {
            "file_hash": file_hash,
            "chunk_index": idx,
            "text": chunk,
            "path": path,
        }
        }
        for idx, (chunk, embedding) in enumerate(zip(chunks, all_embeddings))
        ]

# ── 5. upsert into Pinecone ─────────────────────────────────────────────
        await asyncio.to_thread(pinecone_index.upsert, vectors=vectors)
        print(f"[embed_and_index] Upserted {len(vectors)} vectors into Pinecone")
        # ── 6. mark as indexed ───────────────────────────────────────────────
        await db.files.update_one(
            {"file_hash": file_hash},
            {"$set": {
                "embedding_status": "indexed",
                "indexed_at": datetime.now(),
                "chunk_count": total
            }}
        )
        print(f"[embed_and_index] Done: {file_hash}")

    except Exception as e:
        print(f"[embed_and_index] ❌ Failed for {file_hash}: {e}")
        await db.files.update_one(
            {"file_hash": file_hash},
            {"$set": {"embedding_status": "failed", "error": str(e)}}
        )















async def get_file_text(file_hash: str, db) -> str | None:
    # check cache first
    if file_hash in _cache:
        return _cache[file_hash]
    
    # DB query only on cache miss
    doc = await db.files.find_one(
        {"file_hash": file_hash},
        {"full_text": 1}
    )
    
    if doc and doc.get("full_text"):
        _cache[file_hash] = doc["full_text"]   # cache it
        return doc["full_text"]
    
    return None