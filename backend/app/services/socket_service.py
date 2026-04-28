import socketio
import redis.asyncio as aioredis
from datetime import datetime
from bson import ObjectId
from app.core.security import decode_token
from app.db.mongodb import get_db
from app.core.config import settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

redis_client = None

async def get_redis():
    global redis_client
    if not redis_client:
        redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client

async def set_user_online(user_id: str, online: bool):
    db = get_db()
    r = await get_redis()
    if online:
        await r.sadd("online_users", user_id)
    else:
        await r.srem("online_users", user_id)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_online": online, "last_seen": datetime.utcnow()}},
    )

async def get_online_users():
    r = await get_redis()
    return list(await r.smembers("online_users"))

async def save_message(room_id, sender_id, content, message_type="text", media_url=None):
    db = get_db()
    doc = {
        "room_id": room_id,
        "sender_id": sender_id,
        "content": content,
        "message_type": message_type,
        "media_url": media_url,
        "read_by": [sender_id],
        "delivered_to": [sender_id],
        "edited": False,
        "created_at": datetime.utcnow(),
    }
    result = await db.messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    sender = await db.users.find_one({"_id": ObjectId(sender_id)})
    return {
        "id": str(doc["_id"]),
        "room_id": room_id,
        "sender_id": sender_id,
        "sender": {"id": sender_id, "full_name": sender["full_name"], "avatar": sender.get("avatar")} if sender else None,
        "content": content,
        "message_type": message_type,
        "media_url": media_url,
        "read_by": [sender_id],
        "created_at": doc["created_at"].isoformat(),
        "edited": False,
    }

# ── connect / disconnect (no colons, use @sio.event) ──────────────────────

@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get("token")
    if not token:
        return False
    payload = decode_token(token)
    if not payload:
        return False
    user_id = payload["sub"]
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return False
    await sio.save_session(sid, {"user_id": user_id, "full_name": user["full_name"]})
    await sio.enter_room(sid, f"user:{user_id}")
    await set_user_online(user_id, True)
    online_users = await get_online_users()
    await sio.emit("user:online", {"user_id": user_id}, skip_sid=sid)
    await sio.emit("online_users", online_users, to=sid)
    print(f"connected: {user['full_name']} ({sid})")

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    if session:
        user_id = session["user_id"]
        await set_user_online(user_id, False)
        await sio.emit("user:offline", {"user_id": user_id, "last_seen": datetime.utcnow().isoformat()})
        print(f"disconnected: {session['full_name']}")

# ── namespaced events — must use @sio.on("name:with:colons") ──────────────

@sio.on("room:join")
async def room_join(sid, data):
    session = await sio.get_session(sid)
    room_id = data.get("room_id")
    if not room_id or not session:
        return
    db = get_db()
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room or session["user_id"] not in room["members"]:
        await sio.emit("error", {"message": "Access denied"}, to=sid)
        return
    await sio.enter_room(sid, f"room:{room_id}")

@sio.on("room:leave")
async def room_leave(sid, data):
    room_id = data.get("room_id")
    if room_id:
        await sio.leave_room(sid, f"room:{room_id}")

@sio.on("message:send")
async def message_send(sid, data):
    session = await sio.get_session(sid)
    if not session:
        return
    room_id = data.get("room_id")
    content = (data.get("content") or "").strip()
    message_type = data.get("message_type", "text")
    media_url = data.get("media_url")
    if not room_id or (not content and not media_url):
        return
    db = get_db()
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room or session["user_id"] not in room["members"]:
        return
    msg = await save_message(room_id, session["user_id"], content, message_type, media_url)
    await sio.emit("message:new", msg, room=f"room:{room_id}")

@sio.on("message:typing")
async def message_typing(sid, data):
    session = await sio.get_session(sid)
    if not session:
        return
    room_id = data.get("room_id")
    if room_id:
        await sio.emit(
            "message:typing",
            {"user_id": session["user_id"], "full_name": session["full_name"], "room_id": room_id},
            room=f"room:{room_id}",
            skip_sid=sid,
        )

@sio.on("message:stop_typing")
async def message_stop_typing(sid, data):
    session = await sio.get_session(sid)
    if not session:
        return
    room_id = data.get("room_id")
    if room_id:
        await sio.emit(
            "message:stop_typing",
            {"user_id": session["user_id"], "room_id": room_id},
            room=f"room:{room_id}",
            skip_sid=sid,
        )

@sio.on("message:read")
async def message_read(sid, data):
    session = await sio.get_session(sid)
    if not session:
        return
    room_id = data.get("room_id")
    user_id = session["user_id"]
    if not room_id:
        return
    db = get_db()
    await db.messages.update_many(
        {"room_id": room_id, "read_by": {"$nin": [user_id]}},
        {"$push": {"read_by": user_id}},
    )
    await sio.emit(
        "message:read_ack",
        {"room_id": room_id, "user_id": user_id},
        room=f"room:{room_id}",
        skip_sid=sid,
    )
