from __future__ import annotations
# backend/core/database_pg.py — unchanged
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.models.pg_models import Base

_session_factory = None
_engine = None





def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            os.getenv("POSTGRES_URL"),
            echo=False,
            pool_size=5,        # ← lower for Supabase free tier limits
            max_overflow=10,
        )
    return _engine






# backend/core/database_pg.py



def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _session_factory

async def init_postgres():
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[postgres] Tables ready")

async def get_pg_db():
    async with get_session_factory()() as session:
        yield session