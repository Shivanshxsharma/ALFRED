from datetime import timedelta, timezone, datetime
from dotenv import load_dotenv
import httpx
import jwt
from ..core.config import connect_db,get_db
import bcrypt
from fastapi import HTTPException,status
from uuid import uuid4
load_dotenv() 
import os
SECRET_KEY=os.getenv("signature_key")
ACCESS_TOKEN_EXPIRE_MINUTES=30
import os

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI")




# Login Function ----------------------------------------------------------------------------------------
def log_in(user_email,password,db):
    
    try:
        user=db["users"].find_one({"email":user_email})

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No user found with the provided email"
            )
        
        stored_password_hash = user["password_hash"]
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password_hash):
            raise HTTPException (
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )
        
       
        access_token=create_token({"userid":user["userid"],"email":user["email"]})
        refresh_token=update_refresh_token(user["userid"],user["email"],db)
        return {

            "access_token":access_token,"refresh_token":refresh_token
             }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {e}"
        )








# Sign Up Function ----------------------------------------------------------------------------------------
def sign_up(first_name,last_name,email,password,db):
    try:
        existing_user=db["users"].find_one({"email":email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        userid=str(uuid4())
        new_user={
            "userid":userid,
            "First_Name":first_name,
            "Last_Name":last_name,
            "email":email,
            "password_hash":hashed_password,
            "chat_history":[],
            "refresh_token":create_token({'userid':userid,'email':email},expires_delta=timedelta(days=7))
        }

        access_token=create_token({"userid":userid,"email":email})
        result=db["users"].insert_one(new_user)

        return {
            "access_token":access_token,"refresh_token":new_user["refresh_token"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during sign up: {e}"
        )










# Create JWT Token ----------------------------------------------------------------------------------------
def create_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt







# Verify JWT Token----------------------------------------------------------------------------------------
def verify_token(token: str):
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
    







# Update Refresh Token ----------------------------------------------------------------------------------------`

def update_refresh_token(user_id: str, email: str, db):
    try:
        new_refresh_token = create_token({'userid': user_id, 'email': email}, expires_delta=timedelta(days=7))
        db["users"].update_one(
            {'userid': user_id},
            {'$set': {'refresh_token': new_refresh_token}}
        )
        return new_refresh_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating refresh token: {e}"
        )
    













# Oauth with Google ----------------------------------------------------------------------------------------


async def log_in_with_google(code:str,db):
    try:
        async with httpx.AsyncClient() as client:
           token_res = await client.post(
            "https://oauth2.googleapis.com/token",
             data={
             "code":          code,
             "client_id":     GOOGLE_CLIENT_ID,
             "client_secret": GOOGLE_CLIENT_SECRET,
             "redirect_uri":  REDIRECT_URI,
             "grant_type":    "authorization_code",
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
           # user_info = { "email": "john@gmail.com", "name": "John", "picture": "https://..." }
        return get_or_create_user(user_info,db)
        





    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HTTP error during Google authentication: {e}"
        )
    


def get_or_create_user(user_info:dict,db):
 try:
    email = user_info["email"]
    name = user_info.get("name", "")
    first_name, last_name = (name.split(" ", 1) + [""])[:2]

    user = db["users"].find_one({"email": email})
    if user:
        update_refresh_token(user["userid"], email, db)
        access_token = create_token({"userid": user["userid"], "email": email})
        return {
            "access_token": access_token,
            "refresh_token": user["refresh_token"]
        }
    else:
        userid=str(uuid4())
        new_user = {
            "userid": userid,
            "First_Name": first_name,
            "Last_Name": last_name,
            "email": email,
            "password_hash": None,
            "chat_history": [],
            "refresh_token": create_token({'userid':userid,'email':email},expires_delta=timedelta(days=7)),
            "provider": "google"
        }
        
        result = db["users"].insert_one(new_user)
        access_token=create_token({"userid":userid,"email":email})

        return  {
            "access_token":access_token,"refresh_token":new_user["refresh_token"]
        }
 except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in get_or_create_user: {e}"
)