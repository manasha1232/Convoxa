from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.api.auth import get_current_user
from app.core.config import settings
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=503, detail="Media service not configured. Add Cloudinary credentials to .env")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only images are supported")

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    result = cloudinary.uploader.upload(contents, folder="chatapp/messages")
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "width": result.get("width"),
        "height": result.get("height"),
    }
