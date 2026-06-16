"""
config.py
=========
Database configuration — Motor (async) replacing PyMongo (sync).

Why Motor over PyMongo:
    FastAPI runs on an async event loop (uvicorn). PyMongo blocks the
    event loop on every DB call — no other request can run while waiting
    for MongoDB. Motor is fully async — the event loop stays free during
    DB calls, enabling true concurrency.

Migration note for existing routes:
    Motor has the exact same API as PyMongo — just add await:

    PyMongo:  doc = db["chats"].find_one({"chatId": id})
    Motor:    doc = await db["chats"].find_one({"chatId": id})

    PyMongo:  docs = list(db["chats"].find({}))
    Motor:    docs = await db["chats"].find({}).to_list(length=100)

    PyMongo:  db["chats"].insert_one(doc)
    Motor:    await db["chats"].insert_one(doc)
"""

from __future__ import annotations

import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo

MONGO_URI     = os.getenv("MONGO_URI",     "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "Alfred")

# ── Module-level references — set once at startup ──────────────────────────────
client: AsyncIOMotorClient   | None = None
db:     AsyncIOMotorDatabase | None = None

sync_client: pymongo.MongoClient | None = None  # For LangGraph checkpointer only



def get_sync_client() -> pymongo.MongoClient:
    global sync_client
    if sync_client is None:
        sync_client = pymongo.MongoClient(MONGO_URI)
    return sync_client

async def connect_db() -> None:

    global client, db

    client = AsyncIOMotorClient(MONGO_URI)
    db     = client[DATABASE_NAME]

    # Verify connection — Motor ping is async
    await client.admin.command("ping")
    print(f"[DB] Connected to MongoDB: {DATABASE_NAME}")


async def close_db() -> None:

    global client
    if client:
        client.close()
        print("[DB] MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:

    if db is None:
        raise RuntimeError(
            "Database not initialised. "
            "Ensure connect_db() is awaited in your startup handler."
        )
    return db