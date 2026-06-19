import asyncio
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from ..models.models import add_to_Chat
from ..core.config import get_db
from ..services.model import stream_response
from ..core.database import add_to_Db
from ..services.abort import _cancel_events

router = APIRouter(tags=["stream"])


@router.post("/stream")
async def stream_endpoint(req: add_to_Chat, db=Depends(get_db)):
    try:
        query = req.prompt.content
        chatId = req.chatId
        is_new_chat = req.is_new_chat
        user_id = req.user_id
        metadata = req.prompt.meta_data

        await add_to_Db(
            is_new_chat, user_id, chatId,
            {"role": "human", "content": query, "meta_data": metadata.model_dump()},
            db
        )

        cancel_event = asyncio.Event()
        _cancel_events[chatId] = cancel_event

        return StreamingResponse(
            stream_response(query, chatId, db, metadata, cancel_event, user_id),
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
async def abort_stream(chatId: str):
    event = _cancel_events.get(chatId)
    if event:
        event.set()
        return {"status": "aborted"}
    return {"status": "not_found"}