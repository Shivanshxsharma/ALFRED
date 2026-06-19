from fastapi import APIRouter, Depends, HTTPException, Request

from backend.core.pg_database import get_pg_db

from ..core.config import get_db
from ..services.authentication import verify_token
from ..core.database import getUserInfo

router = APIRouter(tags=["user"])


@router.get("/getUserInfo")
async def fetch_user_info(req: Request, db=Depends(get_db), pg_db=Depends(get_pg_db)):
    try:
        data = verify_token(req.cookies.get('at'))
        if data:
            return await getUserInfo(data['userid'], db, pg_db)
    except HTTPException as he:
        raise he