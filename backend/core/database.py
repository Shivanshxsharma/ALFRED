from datetime import datetime ,timedelta,timezone
import os


from fastapi import Depends, HTTPException,status
from uuid_utils import uuid4

from backend.core.model_registry import get_models_for_provider

from ..models.pg_models import UserApiKey
from ..repos.api_key_repo import get_connected_providers_with_hints
from ..repos.user_repo import get_user_by_userid
from ..core.config import connect_db,get_db
from ..models.models import chats,create_User,add_to_Chat,delete_chat,Messages,prompt_req,collections
from ..services.llm_model.title_gen.title_generation import gen_chat_title
import httpx


async def add_to_Db(new_chat: bool, user_id: str, chatId: str, prompt: dict, db):
    try:
        role = prompt["role"]
        content = prompt["content"]
        meta_data = prompt.get("meta_data", None)
        tool_calls = prompt.get("tool_calls", None)

       
        message_doc = {
            "chatId": chatId,
            "userId": user_id,
            "role": role,
            "content": content,
            "meta_data": meta_data,
            "tool_calls": tool_calls,
            "created_at": datetime.now(timezone.utc)
        }

        if new_chat:
            title = await gen_chat_title(prompt)

            new_chat_dict = {
                "chatId": chatId,
                "userId": user_id,       
                "title": title,
                "message_count": 1,      
                "wiki_summarized_count": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }

            await db[collections.CHATS].insert_one(new_chat_dict)

        else:
            await db[collections.CHATS].update_one(
                {"chatId": chatId},
                {
                    "$inc": {"message_count": 1},
                    "$set": {"updated_at": datetime.now(timezone.utc)}  
                }
            )

        # insert message as individual document either way
        await db[collections.MESSAGES].insert_one(message_doc)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during adding data: {e}"
        )






async def getUserInfo(userid: str, db, pg_db):
    try:
        if not userid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="userid is required"
            )

        user = await get_user_by_userid(pg_db, userid)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        connected_providers = await get_connected_providers_with_hints(pg_db, user.userid)
        connected_models = {}
        if connected_providers:
            for provider in connected_providers:
                models = get_models_for_provider(provider["provider"])
                for model_id, meta in models.items():
                    connected_models[model_id] = {**meta, "provider": provider["provider"]}

        chats = await db[collections.CHATS].find(
            {"userId": userid},
            {"_id": 0, "chatId": 1, "title": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(15).to_list(15)

        return {
            "userid": user.userid,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "connected_providers": connected_providers,
            "connected_models": connected_models,
            "chat_history": chats,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )



















async def getChatHistory(userid, skip, page_size, db):
    try:
        hist = await db[collections.CHATS].find(
            {"userId": userid},
            {"_id": 0, "chatId": 1, "title": 1, "updated_at": 1}
        ).sort("updated_at", -1).skip(skip).limit(page_size).to_list(None)
        return {
            "items": hist,
            "hasMore": len(hist) == page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )



async def getChatMessages(userid: str, chatId: str, db):
    try:
        # Ownership check — single, cheap lookup against the indexed `chats` collection.
        # Same 404 whether the chat doesn't exist OR belongs to someone else,
        # so we never leak whether a chat exists to a user who doesn't own it.
        chat = await db[collections.CHATS].find_one({"chatId": chatId, "userId": userid})
        if not chat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )

        # Fetch messages by chatId alone — matches the existing chatId+created_at
        # index directly, and the sort is satisfied by that same index for free.
        messages = await db[collections.MESSAGES].find(
            {"chatId": chatId},
            {"_id": 0}
        ).sort("created_at", 1).to_list(None)

        return messages

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )