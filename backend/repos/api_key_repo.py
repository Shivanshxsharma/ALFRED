# backend/repositories/api_key_repo.py
from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.pg_models import UserApiKey
from backend.core.encryption import encrypt, decrypt
from backend.models.pg_models import SUPPORTED_PROVIDERS

from cachetools import TTLCache
from asyncio import Lock


async def upsert_api_key(db: AsyncSession, user_id: str, provider: str, api_key: str) -> UserApiKey:
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(f"Unsupported provider: {provider}")

    encrypted = encrypt(api_key)
    hint = api_key.strip()[-4:]  

    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted
        existing.key_hint = hint              
        await db.commit()
        return existing

    key = UserApiKey(user_id=user_id, provider=provider, encrypted_key=encrypted, key_hint=hint)
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key


async def get_api_key(db: AsyncSession, user_id: str, provider: str) -> str | None:
    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider
        )
    )
    row = result.scalar_one_or_none()
    return decrypt(row.encrypted_key) if row else None


# async def list_providers(db: AsyncSession, user_id: str) -> list[str]:
#     result = await db.execute(
#         select(UserApiKey.provider).where(UserApiKey.user_id == user_id)
#     )
#     return [row[0] for row in result.fetchall()]


async def delete_api_key(db: AsyncSession, user_id: str, provider: str) -> bool:
    result = await db.execute(
        delete(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider
        )
    )
    await db.commit()
    return result.rowcount > 0



async def get_connected_providers_with_hints(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(UserApiKey.provider, UserApiKey.key_hint, UserApiKey.created_at)
        .where(UserApiKey.user_id == user_id)
    )
    return [
        {"provider": row.provider, "key_hint": f"••••••••••••••••{row.key_hint}", "connected_at": row.created_at}
        for row in result.all()
    ]















#-----------------TTL Cache for API keys-----------------

_key_cache: TTLCache = TTLCache(maxsize=500, ttl=300)
_cache_lock = Lock()


async def get_cached_api_key(db, user_id: str, provider: str) -> str | None:
    cache_key = f"{user_id}:{provider}"
    if cache_key in _key_cache:
        return _key_cache[cache_key]

    async with _cache_lock:
        if cache_key in _key_cache:
            return _key_cache[cache_key]
        raw_key = await get_api_key(db, user_id, provider)
        if raw_key:
            _key_cache[cache_key] = raw_key
        return raw_key


def invalidate_cached_key(user_id: str, provider: str) -> None:
    _key_cache.pop(f"{user_id}:{provider}", None)