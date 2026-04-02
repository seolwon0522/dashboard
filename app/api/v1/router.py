"""
api/v1/router.py — v1 API 라우터 통합
모든 v1 하위 라우터를 하나로 묶어 main.py에서 include
"""
from fastapi import APIRouter

from app.api.v1.dashboard import router as dashboard_router

# v1 접두사를 가진 상위 라우터
router = APIRouter(prefix="/api/v1")
router.include_router(dashboard_router)
