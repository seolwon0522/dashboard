"""
client/redmine_client.py — Redmine REST API 비동기 클라이언트
페이지네이션 자동 처리, 비즈니스 로직 없음 (순수 HTTP 계층)
"""
import logging
from typing import Any

import httpx

from app.core.config import RedmineConfig

logger = logging.getLogger(__name__)


class RedmineClient:
    """Redmine REST API 비동기 클라이언트"""

    def __init__(self, config: RedmineConfig, http_client: httpx.AsyncClient):
        self._config = config
        self._http = http_client
        # 모든 요청에 포함할 인증 헤더
        self._headers = {"X-Redmine-API-Key": config.api_key}

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        """단일 GET 요청. 응답 JSON 반환"""
        url = f"{self._config.base_url}{path}"
        response = await self._http.get(
            url,
            params=params or {},
            headers=self._headers,
            timeout=self._config.timeout,
        )
        response.raise_for_status()
        return response.json()

    async def fetch_all_issues(self, params: dict[str, Any] | None = None) -> list[dict]:
        """
        이슈 전체 목록 조회 (페이지네이션 자동 처리)
        Redmine의 total_count를 기반으로 모든 페이지를 순회
        """
        params = dict(params or {})
        page_size = self._config.page_size
        params.setdefault("limit", page_size)
        params["offset"] = 0

        all_issues: list[dict] = []

        while True:
            data = await self._get("/issues.json", params)
            issues = data.get("issues", [])
            total_count = data.get("total_count", 0)

            all_issues.extend(issues)
            logger.debug(
                "이슈 페이지 조회: offset=%d, 수신=%d, 전체=%d",
                params["offset"], len(issues), total_count,
            )

            # 다음 페이지가 없으면 종료
            params["offset"] += page_size
            if params["offset"] >= total_count:
                break

        return all_issues

    async def fetch_projects(self) -> list[dict]:
        """접근 가능한 전체 프로젝트 목록 조회 (페이지네이션 자동 처리)"""
        page_size = self._config.page_size
        params: dict[str, Any] = {"limit": page_size, "offset": 0}
        all_projects: list[dict] = []

        while True:
            data = await self._get("/projects.json", params)
            projects = data.get("projects", [])
            total_count = data.get("total_count", 0)

            all_projects.extend(projects)

            params["offset"] += page_size
            if params["offset"] >= total_count:
                break

        return all_projects

    async def fetch_issue_detail(self, issue_id: int, include: str = "journals") -> dict:
        """단일 이슈 상세 조회 (journals 포함)"""
        data = await self._get(f"/issues/{issue_id}.json", {"include": include})
        return data.get("issue", {})

    async def fetch_issue_statuses(self) -> list[dict]:
        """Redmine에 등록된 이슈 상태 목록 조회"""
        data = await self._get("/issue_statuses.json")
        return data.get("issue_statuses", [])
