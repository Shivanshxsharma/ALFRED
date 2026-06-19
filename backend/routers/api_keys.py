# backend/routers/api_keys.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.pg_database import get_pg_db
from backend.repos.api_key_repo import upsert_api_key, list_providers, delete_api_key
from backend.core.model_registry import MODEL_REGISTRY

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class ApiKeyRequest(BaseModel):
    provider: str
    api_key: str


@router.get("/available-models")
async def available_models():
    return MODEL_REGISTRY


@router.post("/")
async def save_api_key(body: ApiKeyRequest, user_id: str, db: AsyncSession = Depends(get_pg_db)):
    try:
        await upsert_api_key(db, user_id, body.provider, body.api_key)
        return {"ok": True, "provider": body.provider}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def get_providers(user_id: str, db: AsyncSession = Depends(get_pg_db)):
    providers = await list_providers(db, user_id)
    return {"providers": providers}


@router.delete("/{provider}")
async def remove_api_key(provider: str, user_id: str, db: AsyncSession = Depends(get_pg_db)):
    deleted = await delete_api_key(db, user_id, provider)
    if not deleted:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"ok": True, "deleted": provider}