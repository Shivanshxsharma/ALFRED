"""
wiki_summarizer.py
==================
End-of-session background job that extracts knowledge from a conversation
and writes it to Alfred's wiki memory.
"""

from __future__ import annotations

import asyncio
import traceback
from datetime import date
from typing import List, Literal

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from .wiki_write_tools import (
    create_category,
    get_all_slugs,
    get_categories,
    wiki_upsert,
    wiki_delete,
)


# ── Pydantic schema ────────────────────────────────────────────────────────────

class WikiConcept(BaseModel):
    action: Literal["create", "update", "delete"] = Field(
        description=(
            "create — slug does NOT exist in the existing pages list. New knowledge. "
            "update — slug EXISTS in the existing pages list. Append new or revised knowledge. "
            "delete — page is fully superseded by another page you are creating/updating "
            "in this same session, OR contains information that is now known to be wrong. "
            "Never delete just because a topic wasn't discussed today."
        )
    )
    slug: str = Field(
        description=(
            "URL-safe identifier — lowercase, hyphen-separated. "
            "For create: new slug describing this concept. "
            "For update/delete: MUST exactly match an existing slug from the pages list."
        )
    )
    title: str = Field(
        default="",
        description="Human readable title. Empty string for delete actions."
    )
    category: str = Field(
        default="",
        description=(
            "Category name. Pick the closest existing one. "
            "Propose a new one ONLY if nothing fits. "
            "Empty string for delete actions."
        )
    )
    is_new_category: bool = Field(
        default=False,
        description="True only if category is brand new and must be created."
    )
    category_description: str = Field(
        default="",
        description="Only fill if is_new_category=True. One sentence describing the category."
    )
    summary: str = Field(
        default="",
        description=(
            "One sentence describing what this wiki page contains. "
            "Be specific — this is what Alfred sees without opening the page. "
            "Empty string for delete actions."
        )
    )
    content: str = Field(
        default="",
        description=(
            "Markdown body — the actual knowledge extracted from this session. "
            "Use ## headers for structure. Concise, no filler. "
            "Empty string for delete actions."
        )
    )


class WikiConceptList(BaseModel):
    concepts: List[WikiConcept] = Field(
        default_factory=list,
        description=(
            "Concepts extracted from the conversation. "
            "Empty list if nothing worth remembering was discussed."
        )
    )


# ── Config ─────────────────────────────────────────────────────────────────────

MODEL_NAME   = "gemini-2.5-flash"
MIN_MESSAGES = 4


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_text_from_content(content) -> str:
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "").strip()
                if text:
                    parts.append(text)
        return " ".join(parts)

    return ""


def _build_conversation_text(messages: list[dict]) -> str:
    lines = []
    for msg in messages:
        role    = msg.get("role", "unknown").upper()
        content = _extract_text_from_content(msg.get("content", ""))
        if content:
            lines.append(f"{role}: {content}")
    return "\n\n".join(lines)


def _build_prompt(
    conversation:   str,
    existing_pages: list[dict],
    categories:     list[dict],
) -> str:
    pages_text = "\n".join(
        f"  - `{p['slug']}` ({p.get('category', '')}): {p.get('title', '')}"
        for p in existing_pages
    ) or "  (no pages yet)"

    cats_text = "\n".join(
        f"  - `{c['name']}`: {c['description']}"
        for c in categories
    ) or "  (no categories yet)"

    return f"""You are Alfred's memory curator. Your job is to extract important, \
lasting knowledge from a conversation and structure it as wiki pages for a personal AI assistant.

---

## Existing Wiki Pages
{pages_text}

## Existing Categories
{cats_text}

---

## Conversation
{conversation}

---

## Your Task

Read the conversation and extract distinct pieces of knowledge worth remembering permanently.

### What TO extract
- Technical decisions and the reasoning behind them
- Facts about the user (goals, preferences, constraints, life context)
- Project status, architecture choices, progress updates
- People, relationships, or recurring topics
- Important events or milestones

### What NOT to extract
- Small talk, greetings, or throwaway messages
- Things already fully covered by an existing page with nothing new to add
- Vague or incomplete thoughts with no clear takeaway

### Action rules
- create  — slug is NOT in the existing pages list above
- update  — slug IS in the existing pages list; append new or revised knowledge
- delete  — ONLY if a page is fully superseded by another page you are creating/updating
             in this same session, OR contains information now known to be wrong.
             Never delete just because a topic wasn't discussed today.

### Content rules
- One concept = one page. Three distinct topics = three separate concepts returned.
- For update: write only the NEW knowledge being added. The existing content is already
  stored — do not repeat it. Alfred reads pages chronologically and treats the most
  recent block as the current truth, so corrections can simply be stated as new facts.
- For delete: only slug is needed. Leave title, content, summary empty.
- Summary = ONE sentence max describing what the page is about.
- Slug must be lowercase, hyphen-separated, URL-safe (e.g. "sse-decision", "alfred-stack").
- For category: pick the closest existing one. Propose a new one ONLY if nothing fits at all.

### How Alfred reads wiki pages
Pages accumulate dated blocks over time. When multiple blocks exist on the same topic,
Alfred treats the MOST RECENT block as the current truth. This means you can correct
outdated information simply by stating the new fact in an update — no need to delete
old blocks. Example: if a page says "using MongoDB" and the user just switched to
PostgreSQL, an update block saying "switched to PostgreSQL" is sufficient.
"""


# ── Main entry point ───────────────────────────────────────────────────────────

async def run_summarizer(chat_id: str, db, user_id: str) -> None:
    try:
        chats_col = db["chats"]
        msgs_col  = db["messages"]

        chat = await chats_col.find_one({"chatId": chat_id})
        if chat is None:
            print(f"[wiki_summarizer] chat {chat_id} not found — skipping")
            return

        total_messages = chat.get("message_count", 0)
        already_done   = chat.get("wiki_summarized_count", 0)
        new_count      = total_messages - already_done

        if new_count < MIN_MESSAGES:
            print(f"[wiki_summarizer] only {new_count} new messages — skipping")
            return

        # ✅ claim before fetching — prevents duplicate runs
        claim = await chats_col.update_one(
            {
                "chatId": chat_id,
                "wiki_summarized_count": {"$eq": already_done},
            },
            {"$set": {"wiki_summarized_count": total_messages}},
        )

        if claim.modified_count == 0:
            print(f"[wiki_summarizer] chat {chat_id} already claimed — skipping")
            return

        # ✅ await cursor to get actual list
        new_messages = await msgs_col.find(
            {"chatId": chat_id},
            {"_id": 0, "role": 1, "content": 1}  # only fields needed
        ).sort("created_at", 1).skip(already_done).to_list(None)

        conversation_text = _build_conversation_text(new_messages)
        if not conversation_text.strip():
            return

        existing_pages, categories = await asyncio.gather(
            get_all_slugs(user_id=user_id),
            get_categories(user_id=user_id),  # ✅ scoped to user
        )

        prompt = _build_prompt(conversation_text, existing_pages, categories)

        model = ChatGoogleGenerativeAI(
            model=MODEL_NAME,
            temperature=0.2,
        ).with_structured_output(WikiConceptList)

        wiki_result: WikiConceptList = await model.ainvoke(  # ✅ renamed to avoid shadowing
            [HumanMessage(content=prompt)]
        )

        if not wiki_result.concepts:
            print(f"[wiki_summarizer] no concepts extracted for chat {chat_id}")
            return

        concepts     = wiki_result.concepts
        session_date = date.today().isoformat()

        # create new categories first
        for concept in concepts:
            if concept.action == "delete":
                continue
            if concept.is_new_category and concept.category:
                cat_result = await create_category(
                 name=concept.category,
                description=concept.category_description,
                user_id=user_id,
                 )
                if not cat_result.get("existing"):
                    print(f"[wiki_summarizer] new category created: '{concept.category}'")

        success_count = 0
        delete_count  = 0

        for concept in concepts:
            try:
                if concept.action == "delete":
                    delete_result = await wiki_delete(  # ✅ separate variable
                        user_id=user_id,
                        slug=concept.slug,
                        confirm=True
                    )
                    if delete_result.get("ok"):
                        delete_count += 1
                        print(f"[wiki_summarizer] deleted slug '{concept.slug}'")
                    else:
                        print(f"[wiki_summarizer] delete failed for '{concept.slug}': {delete_result.get('error')}")
                    continue

                await wiki_upsert(
                    user_id=user_id,
                    slug=concept.slug,
                    title=concept.title,
                    category=concept.category,
                    summary=concept.summary,
                    concept_content=concept.content,
                    session_date=session_date,
                )
                success_count += 1

            except Exception as e:
                print(f"[wiki_summarizer] failed for slug '{concept.slug}': {e}")
                continue

        print(
            f"[wiki_summarizer] done — chat {chat_id} -> "
            f"{success_count} written, {delete_count} deleted "
            f"(of {len(concepts)} concepts)"
        )

    except Exception as e:
        print(f"[wiki_summarizer] FATAL ERROR for chat {chat_id}: {e}")
        traceback.print_exc()