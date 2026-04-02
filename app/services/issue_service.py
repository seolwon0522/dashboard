"""
services/issue_service.py — 이슈 집계 비즈니스 로직
상태 그룹 분류, overdue 판단, 요약 통계 생성
"""
from collections import defaultdict
from datetime import date, datetime

from app.client.redmine_client import RedmineClient
from app.core.cache import TTLCache
from app.core.config import Settings
from app.services.utils import calc_overdue


class IssueService:
    """이슈 관련 집계 서비스"""

    def __init__(self, client: RedmineClient, cache: TTLCache, settings: Settings):
        self._client = client
        self._cache = cache
        self._settings = settings

    def _resolve_project(self, project_id: str | None) -> str:
        """프로젝트 ID를 결정. None이면 config 기본값 사용"""
        return project_id or self._settings.dashboard.default_project

    async def _fetch_project_issues(self, project_id: str) -> list[dict]:
        """특정 프로젝트의 전체 이슈를 캐시 경유하여 조회"""
        cache_key = f"issues:{project_id}"

        async def _factory():
            params: dict = {
                "project_id": project_id,
                "status_id": "*",  # 모든 상태 포함
            }
            # 하위 프로젝트 제외 시에만 파라미터 추가 (Redmine: "!*" = 제외)
            if not self._settings.dashboard.include_subprojects:
                params["subproject_id"] = "!*"
            return await self._client.fetch_all_issues(params)

        return await self._cache.get_or_set(
            cache_key,
            _factory,
            ttl=self._settings.dashboard.cache_ttl_seconds,
        )

    async def get_summary(self, project_id: str | None = None) -> dict:
        """
        대시보드 요약 통계 반환
        - 전체 이슈 수
        - 상태 그룹별 이슈 수
        - 기한 초과 이슈 수
        """
        pid = self._resolve_project(project_id)
        issues = await self._fetch_project_issues(pid)

        today = date.today()
        status_groups = self._settings.dashboard.status_groups
        overdue_exclude = self._settings.get_excluded_status_ids(
            self._settings.dashboard.overdue_rule.exclude_status_groups
        )

        # 상태 그룹별 카운트 초기화
        group_counts: dict[str, int] = {group: 0 for group in status_groups}
        overdue_count = 0

        for issue in issues:
            status_id = issue.get("status", {}).get("id")
            group = self._settings.get_status_group(status_id)
            if group:
                group_counts[group] += 1

            # 기한 초과 판단: closed 그룹이 아닌 경우에만 확인
            if status_id not in overdue_exclude:
                is_overdue, _ = calc_overdue(issue.get("due_date"), today)
                if is_overdue:
                    overdue_count += 1

        return {
            "project_id": pid,
            "total": len(issues),
            "by_status_group": group_counts,
            "overdue": overdue_count,
            "cached_at": datetime.now(),
        }

    async def get_overdue_issues(self, project_id: str | None = None) -> dict:
        """기한 초과 이슈 목록 반환"""
        pid = self._resolve_project(project_id)
        issues = await self._fetch_project_issues(pid)

        today = date.today()
        base_url = self._settings.redmine.base_url
        overdue_exclude = self._settings.get_excluded_status_ids(
            self._settings.dashboard.overdue_rule.exclude_status_groups
        )

        overdue_list = []
        for issue in issues:
            status_id = issue.get("status", {}).get("id")
            due_str = issue.get("due_date")

            if not due_str or status_id in overdue_exclude:
                continue

            is_overdue, days_overdue = calc_overdue(due_str, today)
            if not is_overdue:
                continue
            assigned = issue.get("assigned_to")

            overdue_list.append({
                "id": issue["id"],
                "subject": issue.get("subject", ""),
                "due_date": due_str,
                "assigned_to": assigned.get("name") if assigned else None,
                "status": issue.get("status", {}).get("name", ""),
                "priority": issue.get("priority", {}).get("name"),
                "days_overdue": days_overdue,
                "url": f"{base_url}/issues/{issue['id']}",
            })

        # 초과 일수 기준 내림차순 정렬
        overdue_list.sort(key=lambda x: x["days_overdue"], reverse=True)

        return {
            "project_id": pid,
            "count": len(overdue_list),
            "issues": overdue_list,
            "cached_at": datetime.now(),
        }
