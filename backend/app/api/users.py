from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.core.config import settings
from bson import ObjectId
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/users", tags=["users"])

def serialize_user(u):
    return {
        "id": str(u["_id"]),
        "username": u["username"],
        "full_name": u["full_name"],
        "email": u["email"],
        "avatar": u.get("avatar"),
        "bio": u.get("bio", ""),
        "is_online": u.get("is_online", False),
        "last_seen": u.get("last_seen"),
        "email_verified": u.get("email_verified", False),
    }

@router.get("/search")
async def search_users(q: str = Query(..., min_length=1), current_user=Depends(get_current_user)):
    db = get_db()
    users = await db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}},
        ],
        "_id": {"$ne": current_user["_id"]},
    }).limit(10).to_list(10)
    return [serialize_user(u) for u in users]

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=503, detail="Media upload not configured")
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents, folder="chatapp/avatars", transformation=[{"width": 200, "height": 200, "crop": "fill"}]
    )
    db = get_db()
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"avatar": result["secure_url"]}})
    return {"avatar_url": result["secure_url"]}

@router.get("/invite-link")
async def get_invite_link(current_user=Depends(get_current_user)):
    """Generate a shareable invite link for this user."""
    username = current_user["username"]
    invite_url = f"{settings.FRONTEND_URL}/invite/{username}"
    return {
        "invite_url": invite_url,
        "message": f"Hey! Join me on ChatApp 🚀 {invite_url}"
    }
