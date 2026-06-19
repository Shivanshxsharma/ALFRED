import os
import base64
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status

from ..core.config import get_db
from ..services.file_service import embed_and_index, store_file_doc, extract_text, check_duplicate, compute_hash

router = APIRouter(tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


@router.post("/upload")
async def upload_file(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    db=Depends(get_db)
):
    print(f"Received upload request for user_id: {user_id}, filename: {file.filename}")
    try:
        ext = Path(file.filename).suffix.lstrip(".").lower()
        contents = await file.read()

        if ext in IMAGE_EXTENSIONS:
            b64 = base64.b64encode(contents).decode("utf-8")
            print(f"Image uploaded: {file.filename}")
            return {
                "original_name": file.filename,
                "type": "image",
                "base64": b64,
                "mime_type": file.content_type,
            }

        filename = f"{uuid4()}{Path(file.filename).suffix}"
        path = os.path.join(UPLOAD_DIR, filename).replace("\\", "/")

        with open(path, "wb") as f:
            f.write(contents)

        file_hash = compute_hash(contents)
        duplicate_info = await check_duplicate(file, file_hash, db, user_id)
        if duplicate_info is not None:
            return duplicate_info

        text = extract_text(path)
        char_count = len(text)
        needs_rag = char_count > 1000

        await store_file_doc(file_hash, file, path, user_id, needs_rag, char_count, text, db)
        print(f"File stored: {file.filename}")

        if needs_rag:
            background_tasks.add_task(embed_and_index, path, file_hash, text, db)

        return {
            "name": file.filename,
            "path": path,
            "status": "uploaded",
            "file_hash": file_hash,
            "needs_rag": needs_rag,
            "char_count": char_count
        }

    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error uploading file: {e}")