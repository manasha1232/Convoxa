import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.mongodb import connect_db, disconnect_db
from app.api import auth, users, rooms, media
from app.services.socket_service import sio


# ----------------------------
# Lifespan (DB connect)
# ----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Connecting to DB...")
    await connect_db()
    print("✅ DB connected")
    yield
    print("🛑 Disconnecting DB...")
    await disconnect_db()


# ----------------------------
# FastAPI app
# ----------------------------
fastapi_app = FastAPI(
    title="ChatApp API",
    description="Real-time chat backend — FastAPI + Socket.IO",
    version="1.0.0",
    lifespan=lifespan,
)


# ----------------------------
# CORS
# ----------------------------
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------
# Routers (ONLY /api here)
# ----------------------------
fastapi_app.include_router(auth.router,  prefix="/api")
fastapi_app.include_router(users.router, prefix="/api")
fastapi_app.include_router(rooms.router, prefix="/api")
fastapi_app.include_router(media.router, prefix="/api")


# ----------------------------
# Health check
# ----------------------------
@fastapi_app.get("/")
async def health():
    return {"status": "ok", "message": "ChatApp API is running 🚀"}


# ----------------------------
# Socket.IO mount
# ----------------------------
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app,
    socketio_path="/ws/socket.io"
)

# 👇 THIS is what uvicorn runs
app = socket_app