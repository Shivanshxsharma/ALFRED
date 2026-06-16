"""
Alfred Wiki — Write Tools
"""

from __future__ import annotations

from backend.services.wiki_db import (
    WIKI_NAMESPACE,
    _col,
    _embed,
    _pinecone,
    build_embed_text,
    create_category,
    get_categories,
    now,
    serialize,
    slugify,
)

async def get_all_slugs(user_id: str) -> list[dict]:
    col = _col()
    cursor = col.find(
        {"user_id": user_id},
        {"slug": 1, "title": 1, "category": 1, "_id": 0}
    ).sort("category", 1)
    return await cursor.to_list(length=500)

__all__ = ["get_all_slugs", "get_categories", "create_category", "wiki_upsert", "wiki_delete"]

async def wiki_upsert(
    user_id: str,
    title: str,
    category: str,
    summary: str,
    concept_content: str,
    session_date: str,
    slug: str | None = None,
) -> dict:
    col = _col()
    final_slug = slug or slugify(title)
    
    # ADDED: Filter by user_id
    existing = await col.find_one({"user_id": user_id, "slug": final_slug})
    is_perm = category.lower() == "user"

    if not existing:
        initial_content = f"## {title}\n**Session:** {session_date}\n\n{concept_content}"

        doc = {
            "user_id":         user_id,
            "slug":            final_slug,
            "title":           title,
            "category":        category,
            "content":         initial_content,
            "summary":         summary,
            "relevancy_score": 1.0,     
            "is_permanent":    is_perm, 
            "created_at":      now(),
            "updated_at":      now(),
        }

        await col.insert_one(doc)

        await _pinecone_upsert(
            user_id  = user_id,
            slug     = final_slug,
            title    = title,
            category = category,
            summary  = summary,
            content  = initial_content,
        )
        return {"ok": True, "slug": final_slug, "action": "created"}

    new_block = f"\n\n## {title}\n**Session:** {session_date}\n\n{concept_content}"
    updated_content = existing.get("content", "").rstrip("\n") + new_block
    existing_is_perm = existing.get("category", category).lower() == "user"

    await col.update_one(
        {"user_id": user_id, "slug": final_slug},
        {
            "$set": {
                "content":         updated_content,
                "summary":         summary,
                "relevancy_score": 1.0,              
                "is_permanent":    existing_is_perm, 
                "updated_at":      now(),
            }
        }
    )

    await _pinecone_upsert(
        user_id  = user_id,
        slug     = final_slug,
        title    = existing.get("title", title),
        category = existing.get("category", category),
        summary  = summary,
        content  = updated_content,
    )
    return {"ok": True, "slug": final_slug, "action": "appended"}


async def wiki_delete(user_id: str, slug: str, confirm: bool = False) -> dict:
    col = _col()
    doc = await col.find_one(
        {"user_id": user_id, "slug": slug},
        {"title": 1, "category": 1, "_id": 0}
    )

    if not doc:
        return {"ok": False, "error": f"Wiki page `{slug}` not found."}

    if not confirm:
        return {
            "ok": True, "dry_run": True, "slug": slug,
            "title": doc.get("title", slug), "category": doc.get("category", "—"),
            "message": "Pass confirm=True to actually delete."
        }

    await col.delete_one({"user_id": user_id, "slug": slug})

    try:
        # ADDED: Safely delete unique pinecone ID
        _pinecone().delete(ids=[f"{user_id}_{slug}"], namespace=WIKI_NAMESPACE)
    except Exception as e:
        return {"ok": False, "error": f"Deleted from MongoDB but Pinecone delete failed: {e}"}

    return {"ok": True, "deleted": slug}


async def _pinecone_upsert(
    user_id: str,
    slug: str,
    title: str,
    category: str,
    summary: str,
    content: str,
) -> None:
    embed_text = build_embed_text(title, category, summary, content)
    vector = await _embed(embed_text)

    _pinecone().upsert(
        vectors=[
            {
                "id":       f"{user_id}_{slug}",  # Unique ID across users
                "values":   vector,
                "metadata": {
                    "user_id":  user_id,          # Added for safe filtering
                    "slug":     slug,
                    "title":    title,
                    "category": category,
                    "summary":  summary,
                },
            }
        ],
        namespace=WIKI_NAMESPACE,
    )