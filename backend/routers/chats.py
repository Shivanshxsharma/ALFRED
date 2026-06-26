from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.errors import PyMongoError

from ..models.models import new_Chat
from ..core.config import get_db
from ..services.auth.authentication import get_current_user, verify_token
from ..core.database import getChatHistory, getChatMessages

router = APIRouter(tags=["chats"], dependencies=[Depends(get_current_user)])


@router.post("/newChat")
async def new_chat(req: new_Chat, db=Depends(get_db), user: dict = Depends(get_current_user)):
    try:
        first_msg_dict = req.First_Message.model_dump()
        new_chat_dict = {
            "title": "new chat",
            "messages": [first_msg_dict],
            "wiki_summarized_count": 0
        }

        inserted_chat = await db["chats"].insert_one(new_chat_dict)
        new_chat_id = str(inserted_chat.inserted_id)

        await db["users"].update_one(
            {"_id": ObjectId(user["userid"])},
            {"$push": {"chat_history": new_chat_id}}
        )

        return {"new_chat_id": new_chat_id, "status": "new chat created successfully"}

    except PyMongoError as e:
        raise HTTPException(status_code=500, detail=f"{e} Database error while creating chat")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{e} Unexpected error occurred")


@router.get("/getChatHistory")
async def get_chat_history(req: Request, skip: int, size: int, db=Depends(get_db), user: dict = Depends(get_current_user)):
    try:
       
        if user.get("is_guest", False):
            return {"items": [], "has_more": False}
        return await getChatHistory(userid=user["userid"], skip=skip, page_size=size, db=db)
    except HTTPException as he:
        raise he

@router.get("/getChatMessages")
async def get_chat_messages(req: Request, chatId: str, db=Depends(get_db),user: dict = Depends(get_current_user)):
    try:
        if user.get("is_guest", False):
            return []
        return await getChatMessages(userid=user["userid"], chatId=chatId, db=db)
    except HTTPException as he:
        raise he