# backend/core/model_registry.py
from backend.models.pg_models import SUPPORTED_PROVIDERS


MODEL_REGISTRY = {
    "google_ai_studio": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "free": True,
        "models": {
            "gemini-2.5-flash": {
                "context": "1M", "rpm": 10,
                "thinking": True, "vision": True,
                "supports_tools": True, "supports_temperature": True,
            },
            "gemini-2.5-flash-lite": {
                "context": "1M", "rpm": "higher",
                "thinking": False, "vision": True,
                "supports_tools": True, "supports_temperature": True,
            },
        },
    },

    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "free": True,
        "models": {
            "llama-3.1-8b-instant": {
                "context": "131K", "rpm": 30, "tpm": "6K",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "llama-3.3-70b-versatile": {
                "context": "131K", "rpm": 30, "tpm": "12K",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "meta-llama/llama-4-scout-17b-16e-instruct": {
                "context": "131K", "rpm": 30, "tpm": "30K",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "qwen/qwen3-32b": {
                "context": "131K", "rpm": 60, "tpm": "6K",
                "thinking": True, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "openai/gpt-oss-120b": {
                "context": "131K", "rpm": 30, "tpm": "8K",
                "thinking": True, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
        },
    },

    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "free": True,
        "models": {
            "gpt-oss-120b": {
                "context": "131K", "rpm": 5, "tpm": "30K", "tph": "1M", "tpd": "1M",
                "thinking": True, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "zai-glm-4.7": {
                "context": "200K", "rpm": 5, "tpm": "30K", "tph": "1M", "tpd": "1M",
                "thinking": True, "vision": False,
                "supports_tools": False,  # flagged after the tool-call threading bug seen this session
                "supports_temperature": True,
            },
        },
    },

    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "free": True,
        "models": {
            "codestral-latest": {
                "context": "256K", "rps": 1,
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
        },
    },

    "openrouter_free": {
        "base_url": "https://openrouter.ai/api/v1",
        "free": True,
        "models": {
            "deepseek/deepseek-r1:free": {
                "context": "164K", "best_for": "Reasoning",
                "thinking": True, "vision": False,
                "supports_tools": False, "supports_temperature": False,
            },
            "deepseek/deepseek-v3:free": {
                "context": "164K", "best_for": "General",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "qwen/qwen3-coder:free": {
                "context": "1M", "best_for": "Code",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "meta-llama/llama-4-scout:free": {
                "context": "10M", "best_for": "Long context",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "meta-llama/llama-3.3-70b-instruct:free": {
                "context": "131K", "best_for": "General",
                "thinking": False, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
            "google/gemma-4-26b-a4b-it:free": {
                "context": "131K", "best_for": "Lightweight",
                "thinking": False, "vision": False,
                "supports_tools": False, "supports_temperature": True,
            },
            "nvidia/nemotron-3-ultra-550b-a55b:free": {
                "context": "131K", "best_for": "General",
                "thinking": True, "vision": False,
                "supports_tools": True, "supports_temperature": True,
            },
        },
    },
}





















def get_provider_for_model(model_id: str) -> str | None:
    """Find which provider a model_id belongs to."""
    for provider, config in MODEL_REGISTRY.items():
        if model_id in config["models"]:
            return provider
    return None


def is_valid_model(model_id: str) -> bool:
    return get_provider_for_model(model_id) is not None


def get_base_url(provider: str) -> str:
    return MODEL_REGISTRY[provider]["base_url"]


def get_models_for_provider(provider: str) -> dict[str, dict]:
    """
    Returns the model_id -> metadata dict for a given provider.
    Pure lookup against the code registry — no DB hit.
    """
    if provider not in MODEL_REGISTRY:
        raise ValueError(f"Unsupported provider: {provider}")
    return MODEL_REGISTRY[provider]["models"]


def get_model_meta(model_id: str) -> dict:
    """Full metadata dict for a single model, regardless of provider."""
    provider = get_provider_for_model(model_id)
    if provider is None:
        raise ValueError(f"Unknown model: {model_id}")
    return MODEL_REGISTRY[provider]["models"][model_id]