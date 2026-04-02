"""
services/project_service.py — 프로젝트 목록 + 이슈 수 집계
N+1 방지: 이슈를 한 번 조회 후 project.id로 groupby
"""
from collections import defaultdict
from datetime import datetime

from app.client.redmine_client import RedmineClient
from app.core.cache import TTLCache
from app.core.config import Settings


class ProjectService:
    """프로젝트 관련 서비스"""

    def __init__(self, client: RedmineClient, cache: TTLCache, settings: Settings):
        self._client = client
        self._cache = cache
        self._settings = settings

    async def get_project_list(self) -> dict:
        """
        프로젝트 목록 + 각 프로젝트의 open 이슈 수 반환
        프로젝트 목록은 Redmine API 1회, 이슈 목록은 별도 1회 조회 후 집계
        """
        cache_key = "projects:list"

        async def _factory():
            # 프로젝트 목록 조회
            projects = await self._client.fetch_projects()

            # 전체 이슈 조회 (open 상태 그룹만)
            open_ids = self._settings.dashboard.status_groups.get("open", [])
            in_progress_ids = self._settings.dashboard.status_groups.get("in_progress", [])
            active_ids = open_ids + in_progress_ids

            # open + in_progress 상태의 이슈를 한 번에 조회
            all_issues = await self._client.fetch_all_issues({
                "status_id": "|".join(str(sid) for sid in active_ids) if active_ids else "*",
            })

            # 프로젝트별 open 이슈 수 집계
            issue_counts: dict[int, int] = defaultdict(int)
            for issue in all_issues:
                proj_id = issue.get("project", {}).get("id")
                if proj_id is not None:
                    issue_counts[proj_id] += 1

            result = []
            for proj in projects:
                result.append({
                    "id": proj.get("identifier", ""),
                    "name": proj.get("name", ""),
                    "open_issues": issue_counts.get(proj.get("id", 0), 0),
                })

            return result

        projects = await self._cache.get_or_set(
            cache_key,
            _factory,
            ttl=self._settings.dashboard.cache_ttl_seconds,
        )

        return {
            "projects": projects,
            "cached_at": datetime.now(),
        }
