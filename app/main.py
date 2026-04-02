"""
main.py — FastAPI 앱 진입점
lifespan 이벤트로 httpx.AsyncClient 생성/정리, 서비스 객체 초기화
"""
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.client.redmine_client import RedmineClient
from app.core.cache import TTLCache
from app.core.config import get_settings
from app.services.issue_service import IssueService
from app.services.project_service import ProjectService
from app.services.workload_service import WorkloadService

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 리소스 관리"""
    settings = get_settings()
    logger.info("설정 로드 완료: project=%s", settings.dashboard.default_project)

    # httpx AsyncClient 생성 (커넥션 풀 재사용)
    http_client = httpx.AsyncClient()

    # 인메모리 TTL 캐시 생성
    cache = TTLCache(default_ttl=settings.dashboard.cache_ttl_seconds)

    # Redmine 클라이언트 생성
    redmine_client = RedmineClient(config=settings.redmine, http_client=http_client)

    # 서비스 객체 생성 → app.state에 저장
    app.state.issue_service = IssueService(client=redmine_client, cache=cache, settings=settings)
    app.state.project_service = ProjectService(client=redmine_client, cache=cache, settings=settings)
    app.state.workload_service = WorkloadService(client=redmine_client, cache=cache, settings=settings)
    app.state.cache = cache

    logger.info("서비스 초기화 완료. 서버 시작")

    yield

    # 종료 시 httpx 클라이언트 정리
    await http_client.aclose()
    logger.info("httpx 클라이언트 종료 완료")


app = FastAPI(
    title="Redmine Dashboard API",
    description="Redmine REST API 기반 대시보드 백엔드 (DB 미사용, 인메모리 캐시)",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 운영 시 구체적인 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# v1 API 라우터 등록
app.include_router(v1_router)


# ── Redmine API 관련 글로벌 예외 핸들러 ──

@app.exception_handler(httpx.HTTPStatusError)
async def redmine_http_error_handler(request: Request, exc: httpx.HTTPStatusError):
    """Redmine API가 4xx/5xx 응답을 반환한 경우 502로 변환"""
    logger.error("Redmine API 오류: %s %s", exc.response.status_code, exc.request.url)
    return JSONResponse(
        status_code=502,
        content={"detail": f"Redmine 서버 오류 ({exc.response.status_code})"},
    )


@app.exception_handler(httpx.ConnectError)
async def redmine_connect_error_handler(request: Request, exc: httpx.ConnectError):
    """Redmine 서버 연결 실패 시 502 반환"""
    logger.error("Redmine 연결 실패: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"detail": "Redmine 서버에 연결할 수 없습니다"},
    )


@app.get("/health", tags=["system"])
async def health_check():
    """헬스체크 엔드포인트"""
    return {"status": "ok"}
