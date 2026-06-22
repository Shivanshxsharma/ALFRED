# backend/routers/api_keys.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.pg_database import get_pg_db
from backend.repos.api_key_repo import get_connected_providers_with_hints, upsert_api_key,  delete_api_key
from backend.core.model_registry import MODEL_REGISTRY
from backend.services.auth.authentication import get_current_user

router = APIRouter(prefix="/api-keys", tags=["api-keys"],dependencies=[Depends(get_current_user)])


class ApiKeyRequest(BaseModel):
    provider: str
    api_key: str


@router.get("/available-models")
async def available_models():
    return MODEL_REGISTRY


@router.post("")
async def save_api_key(body: ApiKeyRequest, 
                       db: AsyncSession = Depends(get_pg_db), 
                       user: dict = Depends(get_current_user)):

    try:


        await upsert_api_key(db, user["userid"], body.provider, body.api_key)
        return {"ok": True, "provider": body.provider}
    except ValueError as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def get_providers(user: dict = Depends(get_current_user), 
                        db: AsyncSession = Depends(get_pg_db)):
    providers = await get_connected_providers_with_hints(db, user["userid"])
    return {"providers": providers}


@router.delete("/{provider}")
async def remove_api_key(provider: str, 
                         user: dict = Depends(get_current_user), 
                         db: AsyncSession = Depends(get_pg_db)):
    deleted = await delete_api_key(db, user["userid"], provider)
    if not deleted:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"ok": True, "deleted": provider}