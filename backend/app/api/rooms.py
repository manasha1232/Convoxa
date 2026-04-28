from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.db.mongodb import get_db
from app.models.schemas import CreateRoomRequest
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/rooms", tags=["rooms"])

def oid(s): return ObjectId(s)

async def serialize_room(room: dict, current_user_id: str, db) -> dict:
    last_msg = await db.messages.find_one(
        {"room_id": str(room["_id"])}, sort=[("created_at", -1)]
    )
    unread = await db.messages.count_documents({
        "room_id": str(room["_id"]),
        "read_by": {"$nin": [current_user_id]},
        "sender_id": {"$ne": current_user_id},
    })

    name = room.get("name")
    avatar = room.get("avatar")
    if not room.get("is_group"):
        other_id = next((m for m in room["members"] if m != current_user_id), None)
        if other_id:
            other = await db.users.find_one({"_id": oid(other_id)})
            if other:
                name = other["full_name"]
                avatar = other.get("avatar")

    return {
        "id": str(room["_id"]),
        "name": name,
        "is_group": room.get("is_group", False),
        "members": room["members"],
        "avatar": avatar,
        "last_message": {
            "content": last_msg["content"],
            "sender_id": last_msg["sender_id"],
            "created_at": last_msg["created_at"].isoformat(),
            "message_type": last_msg.get("message_type", "text"),
        } if last_msg else None,
        "unread_count": unread,
    }

@router.get("/")
async def list_rooms(current_user=Depends(get_current_user)):
    db = get_db()
    uid = str(current_user["_id"])
    rooms = await db.rooms.find({"members": uid}).to_list(50)
    result = [await serialize_room(r, uid, db) for r in rooms]
    result.sort(key=lambda r: (r["last_message"] or {}).get("created_at", ""), reverse=True)
    return result

@router.post("/", status_code=201)
async def create_room(body: CreateRoomRequest, current_user=Depends(get_current_user)):
    db = get_db()
    uid = str(current_user["_id"])
    members = list(set(body.members + [uid]))

    if not body.is_group and len(members) == 2:
        existing = await db.rooms.find_one({
            "is_group": False,
            "members": {"$all": members, "$size": 2},
        })
        if existing:
            return await serialize_room(existing, uid, db)

    room_doc = {
        "name": body.name,
        "is_group": body.is_group,
        "members": members,
        "avatar": None,
        "created_by": uid,
        "created_at": datetime.utcnow(),
    }
    result = await db.rooms.insert_one(room_doc)
    room_doc["_id"] = result.inserted_id
    return await serialize_room(room_doc, uid, db)

@router.get("/{room_id}/messages")
async def get_messages(room_id: str, skip: int = 0, limit: int = 50, current_user=Depends(get_current_user)):
    db = get_db()
    uid = str(current_user["_id"])
    room = await db.rooms.find_one({"_id": oid(room_id)})
    if not room or uid not in room["members"]:
        raise HTTPException(status_code=403, detail="Access denied")

    messages = await db.messages.find(
        {"room_id": room_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    msg_ids = [m["_id"] for m in messages]
    if msg_ids:
        await db.messages.update_many(
            {"_id": {"$in": msg_ids}, "read_by": {"$nin": [uid]}},
            {"$push": {"read_by": uid}},
        )

    result = []
    for m in reversed(messages):
        sender = await db.users.find_one({"_id": oid(m["sender_id"])})
        result.append({
            "id": str(m["_id"]),
            "room_id": m["room_id"],
            "sender_id": m["sender_id"],
            "sender": {"id": m["sender_id"], "full_name": sender["full_name"], "avatar": sender.get("avatar")} if sender else None,
            "content": m["content"],
            "message_type": m.get("message_type", "text"),
            "media_url": m.get("media_url"),
            "read_by": m.get("read_by", []),
            "created_at": m["created_at"].isoformat(),
            "edited": m.get("edited", False),
        })
    return result

@router.delete("/{room_id}/messages/{message_id}", status_code=204)
async def delete_message(room_id: str, message_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    uid = str(current_user["_id"])
    msg = await db.messages.find_one({"_id": oid(message_id), "room_id": room_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg["sender_id"] != uid:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    await db.messages.delete_one({"_id": oid(message_id)})
