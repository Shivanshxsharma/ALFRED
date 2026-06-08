import asyncio
import os
import traceback
from urllib import response
import io
from bson import ObjectId

import os
import shutil
from pathlib import Path
from fastapi import BackgroundTasks, FastAPI, Depends,HTTPException, status,WebSocket,WebSocketDisconnect,Response,Request,UploadFile, File
from uuid import uuid4
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)



from fastapi.responses import StreamingResponse
from datetime import datetime
from ..models.models import authenticate_User, chats, new_Chat,create_User,add_to_Chat,delete_chat,Messages,prompt_req,OAuthCallbackRequest
from ..core.config import connect_db,get_db
from pymongo.errors import PyMongoError
from ..services.model import get_chatModel, get_model,chat_model, stream_response
from ..services.authentication import log_in,sign_up,verify_token,update_refresh_token,create_token,log_in_with_google
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import BaseMessage,HumanMessage,SystemMessage
from ..core.database  import add_to_Db,getUserInfo,getChatHistory,getChatMessages
from ..services.abort import _cancel_events
from ..services.file_service import store_file_doc, extract_text, check_duplicate, compute_hash

app=FastAPI()

origins = [
    "http://localhost:3000",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          
    allow_credentials=True,          
    allow_methods=["*"],              
    allow_headers=["*"],              
)


# Routes
@app.on_event("startup")
async def startup():
     connect_db()

@app.post("/newChat")
async def newChat(req:new_Chat,db=Depends(get_db)):


 try:

    first_msg_dict = req.First_Message.model_dump()
    new_chat_dict={
     "title":"new chat",
     "messages":[first_msg_dict]   
    }
    
    inserted_chat=db["chats"].insert_one(new_chat_dict)
    new_chat_id=str(inserted_chat.inserted_id)

    user_dict = db["users"].update_one(
    {"_id": ObjectId(req.userid)},
    {"$push": {"chat_history": new_chat_id}} 
)

    return {"new_chat_id":new_chat_id,"status":"new chat created successfully"}
 except PyMongoError as e:
        # Database-related errors
           raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{e} Database error while creating chat"
        )

 except Exception as e:
        # Any unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail =f"{e} Unexpected error occurred"
        )








@app.post("/stream")
async def stream_endpoint(req: add_to_Chat, db=Depends(get_db)):
    try:
        query = req.prompt.content
        chatId = req.chatId
        is_new_chat = req.is_new_chat
        user_id = req.user_id
        metadata = req.prompt.meta_data
        
        await add_to_Db(is_new_chat, user_id, chatId, {"role": "human", "content": query, "meta_data": metadata.model_dump()}, db)
        cancel_event = asyncio.Event()
        _cancel_events[chatId] = cancel_event
        return StreamingResponse(
            stream_response(query, chatId, db, metadata,cancel_event),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",      # disables nginx buffering
                "Transfer-Encoding": "chunked",  # forces chunked streaming
            }
        )
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting up stream: {str(e)}"
        )

@app.post("/login")
async def login_endpoint(res:Response,req:authenticate_User,db=Depends(get_db)):

   try:
    access_cred = log_in(req.email,req.password_hash,db)

    res.set_cookie(
        key="rt",
        value=access_cred["refresh_token"],
        httponly=True,
        secure=False,  
        samesite="lax",
        max_age=7*24*60*60,
        path='/'
    )

    res.set_cookie(
        key="at",
        value=access_cred["access_token"],
        httponly=False,
        secure=False,  
        samesite="lax",
        max_age=15*60,
        path='/'
    )

    return {"message": "User logged in successfully"}
   except HTTPException as he:
        raise he


@app.post("/signup")
async def signup_endpoint(res:Response,req:create_User,db=Depends(get_db)):

   try:
    access_cred = sign_up(req.First_Name,req.Last_Name,req.email,req.password_hash,db)

    res.set_cookie(
        key="rt",
        value=access_cred["refresh_token"],
        httponly=True,
        secure=False,  
        samesite="lax",
        max_age=7*24*60*60,
        path='/'
    )

    res.set_cookie(
        key="at",
        value=access_cred["access_token"],
        httponly=False,
        secure=False,  
        samesite="lax",
        max_age=15*60,
        path='/'
    )

    return {"message": "User signed up successfully"}
   except HTTPException as he:
        raise he





@app.get("/getUserInfo")
async def fetchUserInfo(req:Request,db=Depends(get_db)):

  try:
    data=verify_token(req.cookies.get('at'))
    if(data):
        return await getUserInfo(data['userid'],data['email'],db)
  except HTTPException as he:
       raise he





@app.post('/refresh')
async def refresh_endPoint(req:Request,res:Response,db=Depends(get_db)):
    try:
        data=verify_token(req.cookies.get('rt'))
        refreshed_token=update_refresh_token(data['userid'],data['email'],db)
        acess_token=create_token(data)

        res.set_cookie(
        key="rt",
        value=refreshed_token,
        httponly=True,
        secure=False,  
        samesite="lax",
        max_age=7*24*60*60,
        path='/'
       )
        res.set_cookie(
        key="at",
        value=acess_token,
        httponly=False,
        secure=False,  
        samesite="lax",
        max_age=15*60,
        path='/'
       )
        

        return {"message": "User refreshed successfully"}
    except HTTPException as he:
        raise he


        
@app.get("/getChatHistory")
async def get_chat_history(req:Request,page:int ,size:int,db=Depends(get_db)):
      try:
       data=verify_token(req.cookies.get('at'))
       userid=data["userid"]
       hist=await getChatHistory(userid=userid,page=page,page_size=size,db=db)
       return hist
      except HTTPException as he:
        raise he





@app.get("/getChatMessages")
async def get_chat_messages(req:Request,chatId:str,db=Depends(get_db)):
        try:
         data=verify_token(req.cookies.get('at'))
         if not data:
             raise HTTPException(
                 status_code=status.HTTP_401_UNAUTHORIZED,
                 detail="Invalid or missing access token"
             )  
         messages=await getChatMessages(chatId=chatId,db=db)
         return messages
        except HTTPException as he:
            raise he
        



@app.post("/google-auth")
async def google_auth_endpoint(req:OAuthCallbackRequest, res:Response,db=Depends(get_db)):
    try:
        if req.provider != "google":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported authentication provider"
            )
        access_cred = await log_in_with_google(req.code,db)

        res.set_cookie(
            key="rt",
            value=access_cred["refresh_token"],
            httponly=True,
            secure=False,  
            samesite="lax",
            max_age=7*24*60*60,
            path='/'
        )
        res.set_cookie(
            key="at",
            value=access_cred["access_token"],
            httponly=False,
            secure=False,  
            samesite="lax",
            max_age=15*60,
            path='/'
        )
        return {"message": "User logged in with Google successfully"}
    except HTTPException as he:
        raise he    
    except Exception as e:
        print(f"Error in Google authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during Google authentication: {e}"
        )
    


IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}















@app.post("/upload")
async def upload_file(
    file: UploadFile,
    chat_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
    db = Depends(get_db)
):
    try:
        ext = Path(file.filename).suffix.lstrip(".").lower()
        contents = await file.read()

        if ext in IMAGE_EXTENSIONS:
            import base64
            b64 = base64.b64encode(contents).decode("utf-8")
            print(f"Image uploaded: {file.filename}")
            return {
                "original_name": file.filename,
                "type": "image",
                "base64": b64,
                "mime_type": file.content_type,
            }




         
        # document
        filename = f"{uuid4()}{Path(file.filename).suffix}"
        path = os.path.join(UPLOAD_DIR, filename).replace("\\", "/")

        with open(path, "wb") as f:
            f.write(contents)

        print(f"Document uploaded: {file.filename} → {path}")

        file_hash = compute_hash(contents)
        duplicate_info = await check_duplicate(file, file_hash, db, user_id)
        if(duplicate_info is not None):
            return duplicate_info
        

        text = extract_text(path)   
        char_count = len(text)
        needs_rag = char_count > 5000

        await store_file_doc(file_hash, file, path, user_id, chat_id, needs_rag, char_count, text, db)

        if needs_rag:
            background_tasks.add_task(embed_and_index, path, file_hash, text, db)
        

        return {
        "name": file.filename,
        "path": path,
        "file_hash": file_hash,
        "needs_rag": needs_rag,
        "char_count": char_count
     }
        
            
    


    











    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {e}"
        )
    

@app.post("/abort/{chatId}")
async def abort_stream(chatId: str):
    event = _cancel_events.get(chatId)
    if event:
        event.set()
        return {"status": "aborted"}
    return {"status": "not_found"}
    































     