from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ── User ──────────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    avatar: Optional[str] = None
    is_online: bool = False
    last_seen: Optional[datetime] = None

# ── Room ──────────────────────────────────────────────
class CreateRoomRequest(BaseModel):
    name: Optional[str] = None          # required for groups
    members: List[str]                   # list of user IDs
    is_group: bool = False

class RoomOut(BaseModel):
    id: str
    name: Optional[str]
    is_group: bool
    members: List[str]
    avatar: Optional[str] = None
    last_message: Optional[dict] = None
    unread_count: int = 0

# ── Message ───────────────────────────────────────────
class MessageOut(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender: Optional[dict] = None
    content: str
    message_type: str = "text"          # text | image | file
    media_url: Optional[str] = None
    read_by: List[str] = []
    delivered_to: List[str] = []
    created_at: datetime
    edited: bool = False
