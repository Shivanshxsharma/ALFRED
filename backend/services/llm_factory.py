# backend/core/llm_factory.py
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from ..core.model_registry import get_provider_for_model, get_base_url, is_valid_model
from ..repos.api_key_repo import get_cached_api_key
from sqlalchemy.ext.asyncio import AsyncSession

async def build_model_client(db : AsyncSession, user_id: str, model_id: str, temperature: float = 0):
    """
    Builds a ready-to-use chat model client for any provider in MODEL_REGISTRY.
    Google AI Studio gets its own native client (ChatGoogleGenerativeAI) since
    it's the primary provider and benefits from native features — thinking
    budget, grounding, native multimodal handling — that the OpenAI-compat
    passthrough doesn't expose. Every other provider shares one OpenAI-compatible
    path via ChatOpenAI.
    """
    if not is_valid_model(model_id):
        raise ValueError(f"Unknown model: {model_id}")

    provider = get_provider_for_model(model_id)
    api_key = await get_cached_api_key(db, user_id, provider)

    if api_key is None:
        raise ValueError(f"No API key saved for provider '{provider}'. Add one in settings.")

    if provider == "google_ai_studio":
        return ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=api_key,
            temperature=temperature,
            streaming=True,
        )

    # everyone else — Groq, Cerebras, Mistral, OpenRouter — shares this path
    return ChatOpenAI(
        model=model_id,
        api_key=api_key,
        base_url=get_base_url(provider),
        temperature=temperature,
        streaming=True,
    )