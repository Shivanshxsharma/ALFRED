from datetime import datetime, timezone
from pydantic import BaseModel, Field,EmailStr,field_validator
from typing import List , Annotated, Literal,Optional


#    ============= dataBase Models================
class User(BaseModel):
    userid: str = Field(None)
    First_Name:str=Field(...,description="first name of user")
    Last_Name:str=Field(...,description="last name of user")
    email:EmailStr=Field(...,description="email of the user")
    password_hash:Optional[str]=Field(None,description="hashed password of user")
    chat_history:List[str]=Field(description="List of chat ids")
    refresh_token:str=Field(None,description="refresh token for user authentication")
    provider:Optional[str]=Field(None,description="authentication provider")


class Message_data(BaseModel):
     images_uploaded: Optional[List[dict]] = Field([], description="List of image base64 name and mime_type uploaded in the chat")
     files_uploaded: Optional[List[dict]] = Field([], description="List of file paths uploaded in the chat")
     toggled_tools: Optional[dict] = Field({}, description="Dictionary of toggled tools and their states")
     tool_calls: Optional[List[dict]] = Field([], description="List of tool calls with details")
     reasoning_steps: Optional[List[str]] = Field(None, description="Reasoning steps taken by the model")
     error_info: Optional[dict] = Field(None, description="Details of any errors encountered")

class Messages(BaseModel):
     role:Literal["llm","human"]=Field(...,description="role of the entity human or model")
     content:str=Field(description="content given by llm or human")
     meta_data: Optional[Message_data] = Field(None, description="metadata of message which includes tool calls, reasoning steps and error info")
    


class chats(BaseModel):
     chatId: str = Field(...,description="required id of chat")
     title:str=Field(description="title of chat")
     messages:List[Messages]=Field(...,description="List of dictionaries which are Messages")


#     =========request models for validation============


#Users
class create_User(BaseModel):
    First_Name:str=Field(...,description="first name of user")
    Last_Name:str=Field(...,description="last name of user")
    email:EmailStr=Field(...,description="email of the user")
    password_hash:str=Field(...,description="password of user")


class authenticate_User(BaseModel):
    email:EmailStr=Field(...,description="email of the user")
    password_hash:str=Field(...,description="hashed password of user")


    

#chats
class OAuthCallbackRequest(BaseModel):
    code: str
    provider: str

class new_Chat(BaseModel):
     userid:str=Field(description="user id ")
     First_Message:Messages=Field(...,description="first message")
     created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When the chat session was started"
    )


class prompt_req(BaseModel):
     prompt:Messages=Field(...,description="prompt of user")
     context_array:List[str]=Field(...,decsription="context of chat")

class add_to_Chat(BaseModel):
     is_new_chat:bool=Field(...,description="wheter a new chat or not")
     user_id:str=Field(...,description="id of user")
     chatId:str=Field(...,description="concerned chat id")
     prompt:Messages=Field(...,description="message that is to added")

class delete_chat(BaseModel):
     chat_id:str=Field(...,description="chat id that is to be deleted")

#   ===== response models =====

class to_User(BaseModel):
     name:List[str]=Field(...,description="name of user as")
     email:EmailStr=Field(...,description="email of user")


class chat_response(BaseModel):
     response:Messages=Field(...,description="respone of model")















