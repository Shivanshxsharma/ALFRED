"""
Alfred Wiki — Read Tools
"""

from __future__ import annotations

from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from backend.services.wiki_db import _col, serialize, now


async def build_wiki_context_block(user_id: str) -> str:
    col = _col()

    cursor = col.find(
        {"user_id": user_id},
        {"slug": 1, "category": 1, "summary": 1, "_id": 0}
    ).sort("category", 1)
    docs = await cursor.to_list(length=1000)

    if not docs:
        return ""

    grouped: dict[str, list[tuple[str, str]]] = {}
    for doc in docs:
        cat  = doc.get("category", "other")
        slug = doc.get("slug")
        summary = doc.get("summary", "")
        if slug:
            grouped.setdefault(cat, []).append((slug, summary))

    lines = [
        "<wiki_memory>",
        "You have access to the user's long-term memory.",
        "Here are the ONLY valid slugs you can pass to the wiki_read tool:",
        "",
    ]

    for cat, slugs in sorted(grouped.items()):
        lines.append(f"Category: {cat.upper()}")
        for slug, summary in slugs:
            lines.append(f"  - {slug}: {summary}")
        lines.append("")  # ✅ blank line between categories for LLM readability

    lines.extend([
        "RULES FOR MEMORY (CRITICAL):",
        "1. The 'slug' parameter MUST exactly match one of the slugs listed above.",
        "2. YOU ARE FORBIDDEN from guessing or inventing slugs. Only use slugs copied exactly from above.",
        "3. EXAMPLE: User asks 'what is my name?'",
        "   → Look under Category: USER for a slug whose summary mentions personal details.",
        "   → Call wiki_read with that EXACT slug string.",
        "4. If the user asks for personal facts, always check Category: USER first.",
        "</wiki_memory>",
    ])

    return "\n".join(lines)


@tool
async def wiki_read(slug: str, config: RunnableConfig) -> str:
    """
    Fetch the full content of a wiki page by its slug.

    Use this when you see a relevant slug in your <wiki_memory> map.

    Args:
        slug: Unique page identifier (e.g. "sse-websocket-decision").
              Copy this EXACTLY as written from the <wiki_memory> map.
    """
    user_id = config["configurable"].get("user_id")
    if not user_id:
        return "System error: Missing user ID context."

    col = _col()
    doc = await col.find_one({"user_id": user_id, "slug": slug})

    if not doc:
        return (
            f"Wiki page `{slug}` not found. "
            f"Check the <wiki_memory> map to ensure you are using the correct slug."
        )

    # ✅ reset relevancy score on read — page was accessed, decay resets
    await col.update_one(
        {"user_id": user_id, "slug": slug},
        {"$set": {"relevancy_score": 1.0, "last_accessed_at": now()}}
    )

    doc = serialize(doc)

    # ✅ safe updated_at formatting
    updated_at = doc.get("updated_at", "Unknown")
    if hasattr(updated_at, "isoformat"):
        updated_at = updated_at.isoformat()

    return (
        f"# {doc['title']}\n"
        f"**Slug:** `{doc['slug']}`  |  "
        f"**Category:** {doc['category']}  |  "
        f"**Updated:** {updated_at}\n"
        f"---\n\n"
        f"{doc['content']}"
    )


WIKI_READ_TOOLS = [wiki_read]