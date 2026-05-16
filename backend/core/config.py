import os
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from dotenv import load_dotenv


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "Alfred")



client: MongoClient = None
db: Database = None

def connect_db():

    global client, db,users,chats
    
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    # db["chatId"].create_index("chatId", unique=True)

    # Test connection
    client.admin.command('ping')
    print(f"Connected to DB: {DATABASE_NAME}")


def close_db():
    global client
    if client:
        client.close()
        print("DB connection closed")

def get_db() -> Database:
    if(db is None):
        connect_db()
    return db





