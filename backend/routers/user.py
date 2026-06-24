from fastapi import APIRouter, Depends, HTTPException, Request

from backend.core.model_registry import get_models_for_provider
from backend.core.pg_database import get_pg_db
from backend.repos.api_key_repo import get_connected_providers_with_hints

from ..core.config import get_db
from ..services.auth.authentication import get_current_user, verify_token
from ..core.database import getUserInfo

router = APIRouter(tags=["user"])


@router.get("/getUserInfo")
async def fetch_user_info(req: Request, db=Depends(get_db), pg_db=Depends(get_pg_db), user: dict = Depends(get_current_user)):
    try:
        if user.get("is_guest", False):
         print("Guest user detected. Returning guest info.")
         connected_providers = [{"provider": "google_ai_studio", "key_hint": "------GUEST_MODE", "connected_at": None},{"provider": "cerebras", "key_hint": "------GUEST_MODE", "connected_at": None}]
         connected_models = {}
         if connected_providers:
            for provider in connected_providers:
                models = get_models_for_provider(provider["provider"])
                for model_id, meta in models.items():
                    connected_models[model_id] = {**meta, "provider": provider["provider"]}
            return {
                "userid": user["userid"],
                "email": None,
                "first_name": "Guest",
                "last_name": "",
                "is_guest": True,
                "connected_providers": connected_providers,
                "connected_models": connected_models,
                "chat_history": [],
            }
        else:
            return await getUserInfo(user["userid"], db, pg_db)
    except HTTPException as he:
        raise he