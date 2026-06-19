# backend/repositories/user_repo.py
from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.pg_models import User, UserModelPreference
from backend.core.model_registry import is_valid_model


# backend/repositories/user_repo.py
async def create_user(
    db: AsyncSession,
    userid: str,
    first_name: str,
    last_name: str,
    email: str,
    password_hash: str,
    refresh_token: str | None = None,   # ✅ ADDED
    provider: str = "email",            # ✅ ADDED
) -> User:
    user = User(
        userid=userid,
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=password_hash,
        refresh_token=refresh_token,    # ✅ ADDED
        provider=provider,              # ✅ ADDED
    )
    db.add(user)

    prefs = UserModelPreference(user=user)
    db.add(prefs)

    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_userid(db: AsyncSession, userid: str) -> User | None:
    result = await db.execute(select(User).where(User.userid == userid))
    return result.scalar_one_or_none()


async def set_default_model(db: AsyncSession, user_id: str, model_id: str):
    if not is_valid_model(model_id):
        raise ValueError(f"Unknown model: {model_id}")

    result = await db.execute(
        select(UserModelPreference).where(UserModelPreference.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if prefs:
        prefs.default_model = model_id
        await db.commit()
    return prefs