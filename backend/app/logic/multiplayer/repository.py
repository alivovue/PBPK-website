from sqlmodel import Session, select

from app.types.character import Character
from app.types.learning import Topic
from app.types.question import Question as StoredQuestion, QuestionOption

from .models import BattleError, Option, Question


def require_topic(session: Session, topic_id: int | None) -> None:
    if topic_id is not None and session.get(Topic, topic_id) is None:
        raise BattleError(404, "Topic not found")


def character_data(session: Session, character_id: str) -> dict:
    character = session.get(Character, character_id)
    if character is None:
        raise BattleError(404, "Character not found")
    return character.model_dump()


def question_pool(session: Session, topic_id: int | None) -> list[Question]:
    query = select(StoredQuestion, QuestionOption).join(
        QuestionOption, QuestionOption.question_id == StoredQuestion.id
    ).where(StoredQuestion.question_type == "multiple_choice")
    if topic_id is not None:
        query = query.where(StoredQuestion.topic_id == topic_id)
    rows = session.exec(query.order_by(StoredQuestion.id, QuestionOption.option_order,
                                       QuestionOption.id)).all()
    grouped = {}
    for question, option in rows:
        grouped.setdefault(question.id, (question, []))[1].append(option)
    result = []
    for question, options in grouped.values():
        correct = [option for option in options if option.is_correct]
        if (len(options) == 4 and len(correct) == 1 and question.question_text.strip()
                and all(option.option_text.strip() for option in options)):
            result.append(Question(question.id, question.question_text,
                                   tuple(Option(o.id, o.option_text) for o in options),
                                   correct[0].id))
    return result
