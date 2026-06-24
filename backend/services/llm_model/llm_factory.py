import os

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from ...core.model_registry import get_provider_for_model, get_base_url, is_valid_model
from ...repos.api_key_repo import get_cached_api_key
from sqlalchemy.ext.asyncio import AsyncSession

GUEST_ALLOWED_MODELS = {
    "gemini-2.5-flash": os.getenv("GUEST_DEMO_API_KEY_GEMINI"),     # adjust to your actual model_id strings
    "zai-glm-4.7": os.getenv("GUEST_DEMO_API_KEY_GLM"),               # or whatever exact id your model_registry uses
    "gpt-oss-120b": os.getenv("GUEST_DEMO_API_KEY_GPT"),          # same — match your registry's id, not the display name
}

async def build_model_client(
    db: AsyncSession,
    user_id: str,
    model_id: str,
    temperature: float = 0,
    is_guest: bool = False,
):
    if not is_valid_model(model_id):
        raise ValueError(f"Unknown model: {model_id}")

    if is_guest:
        if model_id not in GUEST_ALLOWED_MODELS:
            model_id = "gemini-2.5-flash"  # silently fall back instead of erroring on a recruiter

        provider = get_provider_for_model(model_id)
        api_key = GUEST_ALLOWED_MODELS.get(model_id)
        if api_key is None:
            raise ValueError("Guest demo API key not configured.")
    else:
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
            max_retries=1,
        )

    return ChatOpenAI(
        model=model_id,
        api_key=api_key,
        base_url=get_base_url(provider),
        temperature=temperature,
        streaming=True,
        max_retries=1,
    )