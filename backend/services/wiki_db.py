"""
Alfred Wiki — Shared DB Layer
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any
from .file_service import embeddings_model, pinecone_index
from pymongo import ASCENDING

from backend.core.config import get_db

_pinecone_index: Any | None = None          
_embed_fn: Any | None = None                

WIKI_NAMESPACE = "wiki"                     

def init_wiki(pinecone_index: Any, embed_fn: Any) -> None:
    global _pinecone_index, _embed_fn
    _pinecone_index = pinecone_index
    _embed_fn = embed_fn

def _col():
    return get_db()["wiki_pages"]

def _col_categories():
    return get_db()["wiki_categories"]

def _pinecone():
    if _pinecone_index is None:
        raise RuntimeError("Wiki not initialised. Call init_wiki() in lifespan.")
    return _pinecone_index

async def _embed(text: str) -> list[float]:
    if _embed_fn is None:
        raise RuntimeError("Wiki not initialised. Call init_wiki() in lifespan.")
    return await _embed_fn(text)


SEED_CATEGORIES = [
    {"name": "user", "description": "Facts about Shivansh — goals, preferences, constraints, life context."},
    {"name": "project", "description": "Projects being built or worked on — Alfred, BTP, YouTube channel, etc."},
    {"name": "concept", "description": "Technical knowledge, architecture decisions, patterns, and learnings."},
    {"name": "person", "description": "Other people Shivansh interacts with — professors, recruiters, collaborators."},
]

async def seed_categories() -> None:
    col = _col_categories()
    count = await col.count_documents({})
    if count == 0:
        docs = [{**cat, "created_at": now(), "is_seed": True} for cat in SEED_CATEGORIES]
        await col.insert_many(docs)

async def get_categories() -> list[dict]:
    col = _col_categories()
    cursor = col.find({}, {"name": 1, "description": 1, "_id": 0}).sort("name", 1)
    return await cursor.to_list(length=100)

async def create_category(name: str, description: str) -> dict:
    col = _col_categories()
    name = name.lower().strip().replace(" ", "-")
    existing = await col.find_one({"name": name})
    if existing:
        return {"ok": True, "name": name, "existing": True}

    await col.insert_one({
        "name": name,
        "description": description,
        "created_at": now(),
        "is_seed": False,
    })
    return {"ok": True, "name": name, "existing": False}


async def ensure_wiki_indexes() -> None:
    col = _col()
    # ADDED: Compound unique index. Slug is only unique per user!
    await col.create_index([("user_id", ASCENDING), ("slug", ASCENDING)], unique=True, name="user_slug_unique")
    await col.create_index([("user_id", ASCENDING), ("category", ASCENDING)], name="user_category_idx")

    col_cat = _col_categories()
    await col_cat.create_index([("name", ASCENDING)], unique=True, name="category_name_unique")

    await seed_categories()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text

def now() -> datetime:
    return datetime.now(timezone.utc)

def serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    for key in ("created_at", "updated_at"):
        if isinstance(doc.get(key), datetime):
            doc[key] = doc[key].isoformat()
    return doc

def build_embed_text(title: str, category: str, summary: str, content: str) -> str:
    return f"title: {title}\ncategory: {category}\nsummary: {summary}\ncontent: {content[:1000]}"

async def wiki_embed_fn(text: str) -> list[float]:
    return await asyncio.to_thread(embeddings_model.embed_query, text)


async def search_wiki_vectors(user_id: str, query: str, category: str | None = None, limit: int = 5) -> list[dict]:
    """Fallback semantic search."""
    limit = min(limit, 10)
    query_vector = await _embed(query)

    # ADDED: Mandatory user_id filter for Pinecone
    pinecone_filter = {"user_id": {"$eq": user_id}}
    if category:
        pinecone_filter["category"] = {"$eq": category}

    response = _pinecone().query(
        vector=query_vector,
        top_k=limit,
        namespace=WIKI_NAMESPACE,
        filter=pinecone_filter,
        include_metadata=True,
    )
    
    return response.get("matches", [])