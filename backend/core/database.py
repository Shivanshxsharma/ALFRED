from datetime import datetime ,timedelta,timezone
import os


from fastapi import Depends, HTTPException,status
from uuid_utils import uuid4

from backend.repos.user_repo import get_user_by_userid
from ..core.config import connect_db,get_db
from ..models.models import chats,create_User,add_to_Chat,delete_chat,Messages,prompt_req,collections
import httpx


async def add_to_Db(new_chat: bool, user_id: str, chatId: str, prompt: dict, db):
    try:
        role = prompt["role"]
        content = prompt["content"]
        meta_data = prompt.get("meta_data", None)

        # single message document — always inserted
        message_doc = {
            "chatId": chatId,
            "userId": user_id,
            "role": role,
            "content": content,
            "meta_data": meta_data,
            "created_at": datetime.now(timezone.utc)
        }

        if new_chat:
            from ..services.model import gen_chat_title
            title = await gen_chat_title(prompt)

            new_chat_dict = {
                "chatId": chatId,
                "userId": user_id,       # ← was missing
                "title": title,
                "message_count": 1,      # ← starts at 1, first message
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
                    "$set": {"updated_at": datetime.now(timezone.utc)}  # ← was missing
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

        chats = await db[collections.CHATS].find(
            {"userId": userid},
            {"_id": 0, "chatId": 1, "title": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(15).to_list(15)

        # ✅ build a plain dict instead of mutating the ORM object
        return {
            "userid": user.userid,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "provider": user.provider,
            "chat_history": chats,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )


async def getChatHistory(userid,page,page_size,db):
    try:
        hist=await db[collections.CHATS].find(
            {"userId": userid},
            {"_id": 0,   "chatId": 1, "title": 1, "updated_at": 1}
        ).sort("updated_at", -1).skip(page * page_size).limit(page_size).to_list(None)
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
            messages = await db[collections.MESSAGES].find(
            {"chatId": chatId, "userId": userid},
            {"_id": 0}
            ).to_list(None)
            if not messages:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat not found"
                )

            return messages
        except HTTPException:   
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error during getting data: {e}"
            )
          


