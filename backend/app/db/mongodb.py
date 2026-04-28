from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client.get_default_database()
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.messages.create_index([("room_id", 1), ("created_at", -1)])
    await db.messages.create_index("sender_id")
    await db.rooms.create_index("members")
    print("✅ Connected to MongoDB")

async def disconnect_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")

def get_db():
    return db
