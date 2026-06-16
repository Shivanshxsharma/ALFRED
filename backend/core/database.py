
import os

from fastapi import Depends, HTTPException,status
from uuid_utils import uuid4
from ..core.config import connect_db,get_db
from ..models.models import chats,create_User,add_to_Chat,delete_chat,Messages,prompt_req
import httpx

async def add_to_Db(new_chat:bool,user_id:str,chatId:str,prompt:dict,db):
 try:
    role=prompt["role"]
    content=prompt["content"]
    meta_data=prompt["meta_data"] if "meta_data" in prompt else None
    if new_chat is True:
        from ..services.model  import gen_chat_title
        title=await gen_chat_title(prompt)
        await db["users"].update_one(
        {"userid": user_id},
        {"$push": {"chat_history": {"chatId":chatId,"title":title}}} 
         )
     
        new_chat_message={
         "role":role,
         "content":content,
         "meta_data":meta_data,
         
         }
        new_chat_dict={
           "chatId":chatId,
           "title":title,
            "messages":[new_chat_message],
            "wiki_summarized_count":0
        }

        await db["chats"].insert_one(new_chat_dict)
      
    else:
     message={
       "role":role,
       "content":content,
       "meta_data":meta_data
     }

     await db["chats"].update_one(
        {'chatId':chatId},
        {"$push":{"messages":message}}
     )

 except HTTPException:
        raise
 except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during adding data: {e}"
        )


async def getUserInfo(userid:str,email:str,db):

    try:
        if(not email or not userid):
           raise HTTPException(
               status_code=status.HTTP_400_BAD_REQUEST,
               detail="userid and email are required"
           )
        
        user=await db["users"].find_one({"userid":userid,"email":email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if "_id" in user:
            user["_id"] = str(user["_id"])
        if "chat_history" in user:
            user["chat_history"] = user["chat_history"][-15:][::-1]
        exclude_fields = {"refresh_token", "password_hash", "_id"}
        return {k:v for k,v in user.items() if k not in exclude_fields}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )








async def getChatHistory(userid,page,page_size,db):
    try:
        user=await db["users"].find_one({"userid":userid})
        hist = user["chat_history"][::-1][page:page+page_size]
        return {
            "items": hist,
            "hasMore": len(user["chat_history"]) > page + page_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during getting data: {e}"
        )
    



async def getChatMessages(chatId:str,db):
        try:
            chat=await db["chats"].find_one({"chatId":chatId})
            if not chat:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat not found"
                )

            return chat["messages"]
        except HTTPException:   
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error during getting data: {e}"
            )
          


