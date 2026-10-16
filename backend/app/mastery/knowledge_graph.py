from fastapi import HTTPException
from sqlmodel import Session, select

from app.types.learning import Topic, TopicPrerequisite
from app.types.mastery import UserTopicMastery


def prerequisites(session: Session, topic_id: int) -> list[dict]:
    if session.get(Topic, topic_id) is None:
        raise HTTPException(404, "Topic not found")
    seen = {topic_id}
    result = []
    queue = [(topic_id, 0)]
    while queue:
        current, depth = queue.pop(0)
        if depth >= 5:
            continue
        edges = session.exec(select(TopicPrerequisite).where(
            TopicPrerequisite.topic_id == current)).all()
        for edge in edges:
            parent_id = edge.prerequisite_topic_id
            if parent_id in seen:
                continue
            seen.add(parent_id)
            topic = session.get(Topic, parent_id)
            if topic:
                result.append({"topic_id": topic.id, "name": topic.name,
                               "distance": depth + 1})
                queue.append((topic.id, depth + 1))
    return result


def recommendations(session: Session, user_id: int, limit: int = 10) -> list[dict]:
    rows = session.exec(select(UserTopicMastery).where(
        UserTopicMastery.user_id == user_id).order_by(
            UserTopicMastery.mastery_score.asc())).all()
    suggested = {}
    for mastery in rows:
        if mastery.mastery_score >= 0.8:
            continue
        for item in prerequisites(session, mastery.topic_id):
            tm = session.get(UserTopicMastery, (user_id, item["topic_id"]))
            score = tm.mastery_score if tm else 0.0
            if score < 0.8:
                suggested[item["topic_id"]] = {
                    **item, "mastery_score": score,
                    "because_topic_id": mastery.topic_id,
                }
        topic = session.get(Topic, mastery.topic_id)
        if topic and topic.id not in suggested:
            suggested[topic.id] = {"topic_id": topic.id, "name": topic.name,
                                   "distance": 0, "mastery_score": mastery.mastery_score,
                                   "because_topic_id": topic.id}
    return sorted(suggested.values(), key=lambda x: (x["mastery_score"], -x["distance"]))[:limit]
