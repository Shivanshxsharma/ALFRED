import os
import base64
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status

from backend.services.auth.authentication import get_current_user

from ..core.config import get_db
from ..services.files.file_service import embed_and_index, store_file_doc, extract_text, check_duplicate, compute_hash

router = APIRouter(tags=["files"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


import cloudinary
import cloudinary.uploader
import tempfile

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

@router.post("/upload")
async def upload_file(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    user: dict = Depends(get_current_user)
):
    try:

        if user.get("is_guest"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guest users cannot upload files."
            )

        ext = Path(file.filename).suffix.lstrip(".").lower()
        contents = await file.read()

        if ext in IMAGE_EXTENSIONS:
            b64 = base64.b64encode(contents).decode("utf-8")
            
            return {
                "original_name": file.filename,
                "type": "image",
                "base64": b64,
                "mime_type": file.content_type,
            }

        file_hash = compute_hash(contents)
        duplicate_info = await check_duplicate(file, file_hash, db, user["userid"])
        if duplicate_info is not None:
            return duplicate_info

        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            text = extract_text(tmp_path)
            
            char_count = len(text)
            needs_rag = char_count > 1000

            upload_result = cloudinary.uploader.upload(
                tmp_path,
                resource_type="auto",
                public_id=f"{user['userid']}/{file_hash}",
                folder="alfred_uploads",
                overwrite=False,
            )
            cloud_url = upload_result["secure_url"]

        finally:
            os.remove(tmp_path)

        await store_file_doc(file_hash, file, cloud_url, user["userid"], needs_rag, char_count, text, db)
        

        if needs_rag:
            background_tasks.add_task(embed_and_index, cloud_url, file_hash, text, db)

        return {
            "name": file.filename,
            "path": cloud_url,
            "status": "uploaded",
            "file_hash": file_hash,
            "needs_rag": needs_rag,
            "char_count": char_count
        }

    except HTTPException:
        raise  # let intentional HTTPExceptions (like the 403 above) pass through unchanged

    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error uploading file: {e}")