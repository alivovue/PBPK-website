from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session
from app.account import service
from database.database import get_session

router = APIRouter(prefix="/account", tags=["Account"])


class RegisterBody(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = None
    school_grade: int = Field(default=7, ge=1, le=12)


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterBody, session: Session = Depends(get_session)):
    return service.register(session, **body.model_dump())


@router.post("/login")
def login(body: LoginBody, session: Session = Depends(get_session)):
    return service.login(session, body.username, body.password)


@router.get("/me")
def me(user=Depends(service.get_current_user)):
    return service.public_user(user)
