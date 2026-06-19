from fastapi import APIRouter, Depends, HTTPException, Response, Request

from ..models.models import authenticate_User, create_User, OAuthCallbackRequest
from ..core.config import get_db
from ..services.authentication import (
    log_in, sign_up, verify_token, update_refresh_token,
    create_token, log_in_with_google
)
from ..core.pg_database import get_pg_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["auth"])


def _set_auth_cookies(res: Response, refresh_token: str, access_token: str):
    res.set_cookie(
        key="rt", value=refresh_token, httponly=True,
        secure=False, samesite="lax", max_age=7 * 24 * 60 * 60, path='/'
    )
    res.set_cookie(
        key="at", value=access_token, httponly=False,
        secure=False, samesite="lax", max_age=15 * 60, path='/'
    )

# backend/routers/auth.py — update each route

@router.post("/login")
async def login_endpoint(
    res: Response,
    req: authenticate_User,
    pg_db: AsyncSession = Depends(get_pg_db)  # ✅ new dependency
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
    pg_db: AsyncSession = Depends(get_pg_db)  # ✅ new dependency
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
    pg_db: AsyncSession = Depends(get_pg_db)  # ✅ new dependency
):
    try:
        data = verify_token(req.cookies.get('rt'))
        refreshed_token = await update_refresh_token(data['userid'], data['email'], pg_db)
        access_token = create_token(data)
        _set_auth_cookies(res, refreshed_token, access_token)
        return {"message": "User refreshed successfully"}
    except HTTPException as he:
        raise he


@router.post("/google-auth")
async def google_auth_endpoint(
    req: OAuthCallbackRequest,
    res: Response,
    pg_db: AsyncSession = Depends(get_pg_db)  # ✅ new dependency
):
    try:
        if req.provider != "google":
            raise HTTPException(status_code=400, detail="Unsupported authentication provider")

        access_cred = await log_in_with_google(req.code, pg_db)
        _set_auth_cookies(res, access_cred["refresh_token"], access_cred["access_token"])
        return {"message": "User logged in with Google successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in Google authentication: {e}")
        raise HTTPException(status_code=500, detail=f"Error during Google authentication: {e}")
    





    # backend/routers/auth.py — add this
@router.post("/logout")
async def logout_endpoint(res: Response):
    res.delete_cookie("at", path="/")
    res.delete_cookie("rt", path="/")
    return {"ok": "Logged out successfully"}