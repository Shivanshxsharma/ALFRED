import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from backend.core.pg_database import get_pg_db

from ..services.auth.authentication import get_current_user

from ..models.models import add_to_Chat
from ..core.config import get_db
from ..services.llm_model.model import stream_response
from ..core.database import add_to_Db
from ..services.abort.abort import _cancel_events

router = APIRouter(tags=["stream"], dependencies=[Depends(get_current_user)])

@router.post("/stream")
async def stream_endpoint(req: add_to_Chat, 
                          db=Depends(get_db), 
                          pg_db=Depends(get_pg_db), 
                          user: dict = Depends(get_current_user)):
    try:
        query = req.prompt.content
        chatId = req.chatId
        is_new_chat = req.is_new_chat
        user_id = user["userid"]
        is_guest = user.get("is_guest", False)
        metadata = req.prompt.meta_data

        if not is_guest:
            await add_to_Db(
                is_new_chat, user_id, chatId,
                {"role": "human", "content": query, "meta_data": metadata.model_dump()},
                db
            )

        cancel_event = asyncio.Event()
        _cancel_events[chatId] = cancel_event

        return StreamingResponse(
            stream_response(query, chatId, db, pg_db, metadata, cancel_event, user_id, is_guest=is_guest),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Transfer-Encoding": "chunked",
            }
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting up stream: {str(e)}"
        )


@router.post("/abort/{chatId}")
async def abort_stream(chatId: str, user: dict = Depends(get_current_user)):
    event = _cancel_events.get(chatId)
    if event:
        event.set()
        return {"status": "aborted"}
    return {"status": "not_found"}