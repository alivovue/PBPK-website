from pathlib import Path

from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine

# Database directory
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database file
DB_PATH = DATA_DIR / "cultivation.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

# SQLite engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


# Enable foreign key enforcement
@event.listens_for(engine, "connect")
def enable_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def init_db():
    # Register every model
    import app.types

    # Create missing tables
    SQLModel.metadata.create_all(engine)

    # Default cultivation ranks
    from app.types.progression import Rank

    default_ranks = [
        Rank(
            id=1,
            name="Qi Refining",
            rank_order=1,
            min_level=1,
            theme_stage=1
        ),
        Rank(
            id=2,
            name="Foundation Establishment",
            rank_order=2,
            min_level=10,
            theme_stage=2
        ),
        Rank(
            id=3,
            name="Core Formation",
            rank_order=3,
            min_level=25,
            theme_stage=3
        ),
        Rank(
            id=4,
            name="Nascent Soul",
            rank_order=4,
            min_level=50,
            theme_stage=4
        ),
    ]

    with Session(engine) as session:
        for rank in default_ranks:
            if session.get(Rank, rank.id) is None:
                session.add(rank)

        session.commit()


def get_session():
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at: {DB_PATH}")
