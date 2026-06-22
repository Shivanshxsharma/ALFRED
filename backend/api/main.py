from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from ..core.pg_database import init_postgres
from ..core.config import connect_db, close_db, get_db, get_sync_client
from ..services.wiki_memory.wiki_db import init_wiki, ensure_wiki_indexes, wiki_embed_fn
from ..services.files.file_service import pinecone_index

from ..routers import auth, user, chats, stream, files, session, api_keys


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    motor_db = get_db()
    await init_postgres()
    sync_client = get_sync_client()

    init_wiki(
        pinecone_idx=pinecone_index,
        embed_fn=wiki_embed_fn,
    )
    await ensure_wiki_indexes()

    yield

    await close_db()
    sync_client.close()


app = FastAPI(lifespan=lifespan)

origins = ["FRONTEND_ORIGIN"]  # set this in .env to your frontend URL, e.g. "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(chats.router)
app.include_router(stream.router)
app.include_router(files.router)
app.include_router(session.router)
app.include_router(api_keys.router)