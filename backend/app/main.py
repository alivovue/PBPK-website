import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.database import init_db
from app.routers import (
    account, player, characters, learning, mastery, progression,
    leaderboard, exam, competition, heart_demon, multiplayer,
)
from app.logic.multiplayer.service import MultiplayerService

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.multiplayer = MultiplayerService()
    await app.state.multiplayer.start()
    try:
        yield
    finally:
        await app.state.multiplayer.stop()


app = FastAPI(title="Cultivation Learning API", version="0.3.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

for module in (account, player, characters, learning, mastery, progression,
               leaderboard, exam, competition, heart_demon, multiplayer):
    app.include_router(module.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Cultivation Learning API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
