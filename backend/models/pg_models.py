# backend/models/pg_models.py
from __future__ import annotations
import uuid
from datetime import datetime, timezone

from langchain_protocol import Literal
from pydantic import BaseModel
from sqlalchemy import CheckConstraint, Column, String, Text, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship








# backend/models/pg_models.py — update constraint
SUPPORTED_PROVIDERS = (
    "google_ai_studio", "groq", "cerebras",
    "mistral", "openrouter_free", "openrouter_paid"
)


class UserApiKeyCreate(BaseModel):
    provider: Literal["google_ai_studio", "groq", "cerebras", "mistral", "openrouter_free", "openrouter_paid"]
    api_key: str






def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    userid        = Column(UUID(as_uuid=True), unique=True, nullable=False,primary_key=True)  # ✅ ADDED — unique user identifier (UUID or similar)
    first_name    = Column(String(50))
    last_name     = Column(String(50))
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)              # ✅ ADDED — your own JWT refresh token (7-day)
    provider      = Column(String(20), default="email")      # ✅ ADDED — 'email' or 'google' (login method)
    created_at    = Column(DateTime(timezone=True), default=now)

    api_keys     = relationship("UserApiKey", back_populates="user", cascade="all, delete")
    preferences  = relationship("UserModelPreference", back_populates="user", uselist=False, cascade="all, delete")
    oauth_tokens = relationship("OAuthToken", back_populates="user", cascade="all, delete")



class UserApiKey(Base):
    __tablename__ = "user_api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
        CheckConstraint(
            "provider IN ('google_ai_studio','groq','cerebras','mistral','openrouter_free','openrouter_paid')",
            name="ck_valid_provider"
        ),
    )

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # row's own PK — unrelated to user identity
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.userid", ondelete="CASCADE"), nullable=False)  # ✅ type + FK target changed
    provider      = Column(String(50), nullable=False)
    encrypted_key = Column(Text, nullable=False)
    key_hint      = Column(String(8), nullable=False)
    created_at    = Column(DateTime(timezone=True), default=now)

    user = relationship("User", back_populates="api_keys")

class UserModelPreference(Base):
    __tablename__ = "user_model_preferences"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.userid", ondelete="CASCADE"), nullable=False, unique=True)
    default_model = Column(String(100), default="gemini-2.5-flash")
    temperature   = Column(Float, default=0)
    created_at    = Column(DateTime(timezone=True), default=now)

    user = relationship("User", back_populates="preferences")


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_oauth_provider"),)

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID, ForeignKey("users.userid", ondelete="CASCADE"), nullable=False)
    provider      = Column(String(50), nullable=False)   # 'github', 'jira'
    access_token  = Column(Text, nullable=False)
    refresh_token = Column(Text)
    expires_at    = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=now)

    user = relationship("User", back_populates="oauth_tokens")


class ToolExecutionLog(Base):
    __tablename__ = "tool_execution_log"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key = Column(String(64), unique=True, nullable=False)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.userid", ondelete="CASCADE"))
    tool_name       = Column(String(100), nullable=False)
    status          = Column(String(20), nullable=False, default="pending")
    external_id     = Column(String(255))
    created_at      = Column(DateTime(timezone=True), default=now)