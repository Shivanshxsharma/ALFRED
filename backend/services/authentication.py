from datetime import timedelta, timezone, datetime
from dotenv import load_dotenv
import httpx
import jwt
import bcrypt
from fastapi import HTTPException, status
from uuid import uuid4
from fastapi import Request, HTTPException, status, Depends


# ── CHANGED: Postgres imports replace Mongo-only imports ──────────────────
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.pg_database import get_session_factory
from ..repos.user_repo import get_user_by_email, get_user_by_userid, create_user
# ── END CHANGE ──────────────────────────────────────────────────────────

load_dotenv()
import os

SECRET_KEY = os.getenv("signature_key")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")

from sqlalchemy.ext.asyncio import AsyncSession
from ..repos.user_repo import get_user_by_email, get_user_by_userid, create_user


# Login Function ----------------------------------------------------------------------------------------
async def log_in(user_email: str, password: str, pg_db: AsyncSession):
    try:
        user = await get_user_by_email(pg_db, user_email)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No user found with the provided email"
            )

        stored_password_hash = user.password_hash
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password_hash.encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )

        access_token = create_token({"userid": user.userid, "email": user.email})
        refresh_token = await update_refresh_token(user.userid, user.email, pg_db)  # ✅ pass same session

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {e}"
        )


# Sign Up Function ----------------------------------------------------------------------------------------
async def sign_up(first_name: str, last_name: str, email: str, password: str, pg_db: AsyncSession):
    try:
        existing_user = await get_user_by_email(pg_db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        userid = str(uuid4())

        await create_user(
           pg_db,
           userid=userid,
           first_name=first_name,
           last_name=last_name,
           email=email,
           password_hash=hashed_password,
           provider="email",      # ✅ ADDED — marks this as a normal account
    )

        access_token = create_token({"userid": userid, "email": email})
        refresh_token = await update_refresh_token(userid, email, pg_db)  # ✅ same session

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during sign up: {e}"
        )


# Update Refresh Token ----------------------------------------------------------------------------------------
async def update_refresh_token(user_id: str, email: str, pg_db: AsyncSession):
    try:
        new_refresh_token = create_token({'userid': user_id, 'email': email}, expires_delta=timedelta(days=7))

        user = await get_user_by_userid(pg_db, user_id)
        print(user)
        if user:
            user.refresh_token = new_refresh_token
            await pg_db.commit()

        return new_refresh_token
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating refresh token: {e}"
        )


# Oauth with Google ----------------------------------------------------------------------------------------
async def log_in_with_google(code: str, pg_db: AsyncSession):
    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_res.json()
            if "error" in token_data:
                raise HTTPException(400, token_data["error"])

            access_token = token_data["access_token"]

            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_info = user_res.json()

        return await get_or_create_user(user_info, pg_db)  # ✅ pass through

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HTTP error during Google authentication: {e}"
        )













async def get_or_create_user(user_info: dict, pg_db: AsyncSession):
    try:
        email = user_info["email"]
        name = user_info.get("name", "")
        first_name, last_name = (name.split(" ", 1) + [""])[:2]

        user = await get_user_by_email(pg_db, email)

        if user:
            refresh_token = await update_refresh_token(user.userid, email, pg_db)
            access_token = create_token({"userid": user.userid, "email": email})
            return {
                "access_token": access_token,
                "refresh_token": refresh_token
            }
        else:
            userid = str(uuid4())
            user = await create_user(
                pg_db,
                userid=userid,
                first_name=first_name,
                last_name=last_name,
                email=email,
                password_hash="",       # No password for Google accounts
                provider="google", 
                refresh_token=create_token({'userid': userid, 'email': email}, expires_delta=timedelta(days=7))  # Create and store refresh token immediately
            )

            access_token = create_token({"userid": userid, "email": email})
            

            return {
                "access_token": access_token,
                "refresh_token": user.refresh_token  # Return the refresh token we just created and stored
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_or_create_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in get_or_create_user: {e}"
        )
    





def verify_token(token: str):
    # ── UNCHANGED — no DB involved here ──
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token ,no payload found"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token error"
        )
    




    # Create JWT Token ----------------------------------------------------------------------------------------
def create_token(data: dict, expires_delta: timedelta = None):
    # ── UNCHANGED — no DB involved here ──
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt





async def get_current_user(req: Request) -> dict:
    print("Authenticating user for request:", req.url.path)
    token = req.cookies.get("at")
    
    if not token:
        auth_header = req.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            print("Token found in Authorization header")
    if not token:
        print("No token found in cookies or Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated, missing token"
        )
        
    return verify_token(token)
