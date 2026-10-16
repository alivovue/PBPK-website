from fastapi import HTTPException
from sqlmodel import Session, select

from app.player.service import profile_for
from app.types.competition import CurrencyTransaction


def grant_currency(session: Session, user_id: int, amount: int,
                   reason: str, key: str) -> int:
    existing = session.exec(select(CurrencyTransaction).where(
        CurrencyTransaction.idempotency_key == key)).first()
    if existing:
        return 0
    profile = profile_for(session, user_id)
    if profile.currency_balance + amount < 0:
        raise HTTPException(400, "Insufficient currency")
    session.add(CurrencyTransaction(user_id=user_id, amount=amount,
                reason=reason, idempotency_key=key))
    profile.currency_balance += amount
    session.add(profile)
    return amount
