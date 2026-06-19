# backend/core/model_registry.py

MODEL_REGISTRY = {
    "google_ai_studio": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "free": True,
        "models": {
            "gemini-2.5-flash":      {"context": "1M",   "rpm": 10},
            "gemini-2.5-flash-lite": {"context": "1M",   "rpm": "higher"},
        },
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "free": True,
        "models": {
            "llama-3.1-8b-instant":                       {"context": "131K", "rpm": 30},
            "llama-3.3-70b-versatile":                    {"context": "131K", "rpm": 30},
            "meta-llama/llama-4-scout-17b-16e-instruct":  {"context": "131K", "rpm": 30},
            "qwen/qwen3-32b":                              {"context": "131K", "rpm": 30},
            "openai/gpt-oss-120b":                         {"context": "131K", "rpm": 30},
        },
    },
    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "free": True,
        "models": {
            "gpt-oss-120b": {"context": "131K", "rpm": 30, "free_ctx_cap": "8K"},
            "zai-glm-4.7":  {"context": "200K", "rpm": 30, "free_ctx_cap": "8K"},
            "llama3.1-8b":  {"context": "131K", "rpm": 30, "free_ctx_cap": "8K"},
        },
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "free": True,
        "models": {
            "mistral-small-4":     {"context": "256K", "rps": 1},
            "codestral-latest":    {"context": "256K", "rps": 1},
            "mistral-large-latest":{"context": "128K", "rps": 1},
        },
    },
    "openrouter_free": {
        "base_url": "https://openrouter.ai/api/v1",
        "free": True,
        "models": {
            "deepseek/deepseek-r1:free":              {"context": "164K", "best_for": "Reasoning"},
            "deepseek/deepseek-v3:free":               {"context": "164K", "best_for": "General"},
            "qwen/qwen3-coder-480b:free":              {"context": "1M",   "best_for": "Code"},
            "meta-llama/llama-4-scout:free":           {"context": "10M",  "best_for": "Long context"},
            "meta-llama/llama-3.3-70b-instruct:free":  {"context": "131K", "best_for": "General"},
            "google/gemma-3-12b:free":                 {"context": "131K", "best_for": "Lightweight"},
        },
    },
    "openrouter_paid": {
        "base_url": "https://openrouter.ai/api/v1",
        "free": False,
        "models": {
            "moonshotai/kimi-k2.5":     {"context": "256K", "price": "$0.74/$3.50"},
            "xiaomi/mimo-v2.5":         {"context": "1M",   "price": "$0.14/$0.28"},
            "xiaomi/mimo-v2.5-pro":     {"context": "1M",   "price": "$0.44/$0.87"},
            "z-ai/glm-5-turbo":         {"context": "200K", "price": "cheap"},
            "deepseek/deepseek-v4-flash": {"context": "1M", "price": "very cheap"},
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