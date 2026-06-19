from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from ..core.config import get_db
from ..services.authentication import verify_token
from backend.services.wiki_summarizer import run_summarizer

router = APIRouter(tags=["session"])


@router.post("/session-end/{chatId}")
async def session_end(chatId: str, req: Request, background_tasks: BackgroundTasks, db=Depends(get_db)):
    try:
        data = verify_token(req.cookies.get('at'))
        if not data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing access token")

        user_id = data["userid"]
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

        background_tasks.add_task(run_summarizer, chatId, db, user_id)
        return {"ok": True}

    except HTTPException as he:
        raise he