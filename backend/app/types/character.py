from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class CharacterBase(SQLModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    universe: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=100)
    level: int = Field(default=1, ge=1)
    power: int = Field(default=0, ge=0)
    rarity: str = Field(min_length=1, max_length=50)
    color: str = Field(min_length=1, max_length=50)
    sprite_path: str | None = Field(default=None, max_length=255)


class Character(CharacterBase, table=True):
    __tablename__ = "characters"
    __table_args__ = (
        CheckConstraint("level >= 1", name="ck_characters_level"),
        CheckConstraint("power >= 0", name="ck_characters_power"),
    )

    id: str = Field(primary_key=True, min_length=1, max_length=100)


class PlayerCharacter(SQLModel, table=True):
    """A row means this player owns the character."""

    __tablename__ = "player_characters"

    user_id: int = Field(
        foreign_key="users.id", primary_key=True, ondelete="CASCADE"
    )
    character_id: str = Field(
        foreign_key="characters.id", primary_key=True, ondelete="CASCADE"
    )


class CharacterRead(CharacterBase):
    owned: bool = False
