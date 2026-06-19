# backend/repositories/api_key_repo.py
from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.models.pg_models import UserApiKey
from backend.core.encryption import encrypt, decrypt
from backend.models.pg_models import SUPPORTED_PROVIDERS


async def upsert_api_key(db: AsyncSession, user_id: str, provider: str, api_key: str) -> UserApiKey:
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(f"Unsupported provider: {provider}")

    encrypted = encrypt(api_key)

    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted
        await db.commit()
        return existing

    key = UserApiKey(user_id=user_id, provider=provider, encrypted_key=encrypted)
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


async def list_providers(db: AsyncSession, user_id: str) -> list[str]:
    result = await db.execute(
        select(UserApiKey.provider).where(UserApiKey.user_id == user_id)
    )
    return [row[0] for row in result.fetchall()]


async def delete_api_key(db: AsyncSession, user_id: str, provider: str) -> bool:
    result = await db.execute(
        delete(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider
        )
    )
    await db.commit()
    return result.rowcount > 0