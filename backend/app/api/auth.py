from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.core.security import (
    hash_password, verify_password,
    create_access_token, decode_token,
    create_email_token, decode_email_token
)
from app.db.mongodb import get_db
from app.core.config import settings
from bson import ObjectId
from datetime import datetime

# Gmail SMTP
import aiosmtplib
from email.message import EmailMessage


router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


# ----------------------------
# Serialize user
# ----------------------------
def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "email_verified": user.get("email_verified", False),
    }


# ----------------------------
# Get current user
# ----------------------------
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ----------------------------
# EMAIL FUNCTION
# ----------------------------
async def send_verification_email(email: str, full_name: str, token: str):
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    msg = EmailMessage()
    msg["From"] = settings.EMAIL_USER
    msg["To"] = email
    msg["Subject"] = "Verify your email"

    msg.set_content(f"""
Hi {full_name},

Welcome to Convoxa!

Click the link below to verify your email:

{verification_url}

If you didn't sign up, ignore this email.
""")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            start_tls=True,
            username=settings.EMAIL_USER,
            password=settings.EMAIL_PASS,
        )
        print("✅ Email sent")
    except Exception as e:
        print("❌ Email error:", e)


# ----------------------------
# REGISTER
# ----------------------------
@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    db = get_db()

    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "username": body.username,
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "created_at": datetime.utcnow(),
        "email_verified": False
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    access_token = create_access_token({"sub": str(result.inserted_id)})
    email_token = create_email_token(body.email)

    # ✅ still auto-send (safe to keep)
    await send_verification_email(body.email, body.full_name, email_token)

    return {
        "access_token": access_token,
        "user": serialize_user(user_doc)
    }


# ----------------------------
# LOGIN
# ----------------------------
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_db()

    user = await db.users.find_one({"email": body.email})

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Please verify your email first")

    token = create_access_token({"sub": str(user["_id"])})

    return {"access_token": token, "user": serialize_user(user)}


# ----------------------------
# VERIFY EMAIL
# ----------------------------
@router.get("/verify-email")
async def verify_email(token: str):
    email = decode_email_token(token)

    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    db = get_db()

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {"email": email},
        {"$set": {"email_verified": True}}
    )

    return {"message": "Email verified successfully"}


# ----------------------------
# RESEND VERIFICATION (FIXED)
# ----------------------------
@router.post("/resend-verification")
async def resend_verification(body: dict):
    db = get_db()

    email = body.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    user = await db.users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Already verified")

    token = create_email_token(email)

    await send_verification_email(
        email,
        user["full_name"],
        token
    )

    return {"message": "Verification email sent"}


# ----------------------------
# UPDATE PROFILE
# ----------------------------
@router.put("/profile")
async def update_profile(body: dict, current_user=Depends(get_current_user)):
    db = get_db()

    allowed_fields = {"full_name", "bio", "notification_preferences"}
    update_data = {k: v for k, v in body.items() if k in allowed_fields}

    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )

    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    return serialize_user(updated_user)