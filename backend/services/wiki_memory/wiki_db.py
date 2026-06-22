"""
Alfred Wiki — Shared DB Layer
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any
from ..files.file_service import embeddings_model, pinecone_index as _default_pinecone
from pymongo import ASCENDING
from backend.core.config import get_db

_pinecone_index: Any | None = None
_embed_fn: Any | None = None

WIKI_NAMESPACE = "wiki"


def init_wiki(pinecone_idx: Any, embed_fn: Any) -> None:
    global _pinecone_index, _embed_fn
    _pinecone_index = pinecone_idx
    _embed_fn = embed_fn


# ── Collection helpers ─────────────────────────────────────────────────────────

def _col(db=None):
    """Pass db explicitly or fall back to get_db()"""
    _db = db or get_db()
    return _db["wiki_pages"]

def _col_categories(db=None):
    _db = db or get_db()
    return _db["wiki_categories"]

def _pinecone():
    # ✅ fall back to imported default if init_wiki not called
    return _pinecone_index or _default_pinecone

async def _embed(text: str) -> list[float]:
    if _embed_fn is not None:
        return await _embed_fn(text)
    # ✅ fall back to default embeddings model
    return await wiki_embed_fn(text)


# ── Seed categories ────────────────────────────────────────────────────────────

# ✅ Generic — no hardcoded user names
SEED_CATEGORIES = [
    {"name": "user",    "description": "Facts about the user — goals, preferences, constraints, life context."},
    {"name": "project", "description": "Projects being built or worked on."},
    {"name": "concept", "description": "Technical knowledge, architecture decisions, patterns, and learnings."},
    {"name": "person",  "description": "Other people the user interacts with."},
]


async def seed_categories_for_user(user_id: str) -> None:
    """Seed default categories for a new user. Call on signup."""
    col = _col_categories()
    for cat in SEED_CATEGORIES:
        existing = await col.find_one({"name": cat["name"], "user_id": user_id})
        if not existing:
            await col.insert_one({
                **cat,
                "user_id": user_id,  # ✅ scoped to user
                "created_at": now(),
                "is_seed": True,
            })


async def get_categories(user_id: str) -> list[dict]:  # ✅ user scoped
    col = _col_categories()
    cursor = col.find(
        {"user_id": user_id},
        {"name": 1, "description": 1, "_id": 0}
    ).sort("name", 1)
    return await cursor.to_list(length=100)


async def create_category(name: str, description: str, user_id: str) -> dict:  # ✅ user scoped
    col = _col_categories()
    name = name.lower().strip().replace(" ", "-")
    existing = await col.find_one({"name": name, "user_id": user_id})
    if existing:
        return {"ok": True, "name": name, "existing": True}

    await col.insert_one({
        "name": name,
        "description": description,
        "user_id": user_id,  # ✅
        "created_at": now(),
        "is_seed": False,
    })
    return {"ok": True, "name": name, "existing": False}


# ── Indexes ────────────────────────────────────────────────────────────────────

async def ensure_wiki_indexes() -> None:
    col = _col()
    await col.create_index(
        [("user_id", ASCENDING), ("slug", ASCENDING)],
        unique=True,
        name="user_slug_unique"
    )
    await col.create_index(
        [("user_id", ASCENDING), ("category", ASCENDING)],
        name="user_category_idx"
    )

    col_cat = _col_categories()
    # ✅ compound unique — same category name allowed for different users
    await col_cat.create_index(
        [("user_id", ASCENDING), ("name", ASCENDING)],
        unique=True,
        name="user_category_name_unique"
    )
    # ✅ removed seed_categories() from here — seed per user on signup instead


# ── Utilities ──────────────────────────────────────────────────────────────────

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


async def search_wiki_vectors(
    user_id: str,
    query: str,
    category: str | None = None,
    limit: int = 5
) -> list[dict]:
    limit = min(limit, 10)
    query_vector = await _embed(query)

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