"""
services/utils.py — 서비스 계층 공통 유틸리티
"""
from datetime import date


def calc_overdue(due_str: str | None, today: date) -> tuple[bool, int]:
    """
    기한 초과 여부와 초과 일수를 계산하여 반환.
    due_str이 None이거나 아직 기한 내이면 (False, 0) 반환.
    """
    if not due_str:
        return False, 0
    due_date = date.fromisoformat(due_str)
    if due_date < today:
        return True, (today - due_date).days
    return False, 0
