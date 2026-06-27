
from __future__ import annotations

import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo

MONGO_URI     = os.getenv("MONGO_URI",     "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "Alfred")

client: AsyncIOMotorClient   | None = None
db:     AsyncIOMotorDatabase | None = None

sync_client: pymongo.MongoClient | None = None  



def get_sync_client() -> pymongo.MongoClient:
    global sync_client
    if sync_client is None:
        sync_client = pymongo.MongoClient(MONGO_URI)
    return sync_client

async def connect_db() -> None:
    global client, db

    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]

    await db.chats.create_index("userId")
    await db.messages.create_index("chatId")
    await db.users.create_index("email", unique=True)
    await db.wiki_pages.create_index("slug")
    await db.wiki_categories.create_index("userId")
    await db.file_chunks.create_index("file_hash")
    await db.files.create_index(
        [("file_hash", 1), ("user_id", 1)],
        unique=True
    )

    indexes = await db.files.list_indexes().to_list(length=None)
    for idx in indexes:
     print(idx)

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