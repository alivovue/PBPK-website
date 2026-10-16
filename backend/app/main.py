from contextlib import asynccontextmanager
from fastapi import FastAPI

from database.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Cultivation Learning API",
    version="0.1.0",
    lifespan=lifespan
)


@app.get("/")
def root():
    return {
        "message": "Cultivation Learning API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
