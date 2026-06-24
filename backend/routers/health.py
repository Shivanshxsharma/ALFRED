from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {"status": "ok"}