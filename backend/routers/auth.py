from fastapi import APIRouter, Depends, HTTPException, Response, Request
import os
from ..models.models import authenticate_User, create_User, OAuthCallbackRequest
from ..core.config import get_db
from ..services.auth.authentication import (
    get_current_user, log_in, sign_up, verify_token, update_refresh_token,
    create_token, log_in_with_google
)
from ..core.pg_database import get_pg_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["auth"])


def _set_auth_cookies(res: Response, refresh_token: str, access_token: str):
    res.set_cookie(
        key="rt", value=refresh_token, httponly=True,
        secure=True, samesite="none", max_age=7 * 24 * 60 * 60, path='/',
        domain=os.getenv("FRONTEND_URL")
    )
    res.set_cookie(
        key="at", value=access_token, httponly=False,
        secure=True, samesite="none", max_age=15 * 60, path='/',
        domain=os.getenv("FRONTEND_URL")
    )

# backend/routers/auth.py — update each route

@router.post("/login")
async def login_endpoint(
    res: Response,
    req: authenticate_User,
    pg_db: AsyncSession = Depends(get_pg_db)  
):
    try:
        access_cred = await log_in(req.email, req.password_hash, pg_db)
        _set_auth_cookies(res, access_cred["refresh_token"], access_cred["access_token"])
        return {"message": "User logged in successfully"}
    except HTTPException as he:
        raise he


@router.post("/signup")
async def signup_endpoint(
    res: Response,
    req: create_User,
    pg_db: AsyncSession = Depends(get_pg_db)  
):
    try:
        access_cred = await sign_up(req.First_Name, req.Last_Name, req.email, req.password_hash, pg_db)
        _set_auth_cookies(res, access_cred["refresh_token"], access_cred["access_token"])
        return {"message": "User signed up successfully"}
    except HTTPException as he:
        raise he


@router.post('/refresh')
async def refresh_endpoint(
    req: Request,
    res: Response,
    pg_db: AsyncSession = Depends(get_pg_db),
):
    rt = req.cookies.get("rt")
    if not rt:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    payload = verify_token(rt)  # decodes + validates the refresh token itself

    refreshed_token = await update_refresh_token(payload["userid"], payload["email"], pg_db)
    access_token = create_token({"userid": payload["userid"], "email": payload["email"]})

    _set_auth_cookies(res, refreshed_token, access_token)
    return {"message": "Token refreshed successfully"}

@router.post("/google-auth")
async def google_auth_endpoint(
    req: OAuthCallbackRequest,
    res: Response,
    pg_db: AsyncSession = Depends(get_pg_db)  
):
    try:
        if req.provider != "google":
            raise HTTPException(status_code=400, detail="Unsupported authentication provider")

        access_cred = await log_in_with_google(req.code, pg_db)
        _set_auth_cookies(res, access_cred["refresh_token"], access_cred["access_token"])
        return {"message": "User logged in with Google successfully"}
    except HTTPException as he:
        import traceback
        traceback.print_exc() 
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc() 
        print(f"Error in Google authentication: {e}")
        raise HTTPException(status_code=500, detail=f"Error during Google authentication: {e}")
    





    # backend/routers/auth.py — add this
@router.post("/logout")
async def logout_endpoint(res: Response, user: dict = Depends(get_current_user)):
    res.delete_cookie("at", path="/")
    res.delete_cookie("rt", path="/")
    return {"ok": "Logged out successfully"}