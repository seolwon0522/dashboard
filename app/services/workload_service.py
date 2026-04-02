"""
services/workload_service.py — 담당자별 워크로드 집계
미할당 이슈는 "미할당" 키로 별도 집계
"""
from collections import defaultdict
from datetime import date, datetime

from app.client.redmine_client import RedmineClient
from app.core.cache import TTLCache
from app.core.config import Settings


class WorkloadService:
    """담당자별 워크로드 서비스"""

    def __init__(self, client: RedmineClient, cache: TTLCache, settings: Settings):
        self._client = client
        self._cache = cache
        self._settings = settings

    async def get_workload(self, project_id: str | None = None) -> dict:
        """담당자별 open 이슈 수 + overdue 이슈 수 반환"""
        pid = project_id or self._settings.dashboard.default_project
        cache_key = f"workload:{pid}"

        async def _factory():
            # 해당 프로젝트의 전체 이슈 조회
            all_issues = await self._client.fetch_all_issues({
                "project_id": pid,
                "status_id": "*",
            })

            today = date.today()
            closed_ids = self._settings.get_excluded_status_ids(("closed",))
            overdue_exclude = self._settings.get_excluded_status_ids(
                self._settings.dashboard.overdue_rule.exclude_status_groups
            )

            # 담당자별 집계 구조: {user_id: {"name": str, "open": int, "overdue": int}}
            workload: dict[int | None, dict] = defaultdict(
                lambda: {"name": "미할당", "open": 0, "overdue": 0}
            )

            for issue in all_issues:
                status_id = issue.get("status", {}).get("id")

                # closed 그룹 이슈는 워크로드에서 제외
                if status_id in closed_ids:
                    continue

                assigned = issue.get("assigned_to")
                user_id = assigned.get("id") if assigned else None
                user_name = assigned.get("name") if assigned else "미할당"

                entry = workload[user_id]
                entry["name"] = user_name
                entry["open"] += 1

                # 기한 초과 여부 확인
                due_str = issue.get("due_date")
                if due_str and status_id not in overdue_exclude:
                    if date.fromisoformat(due_str) < today:
                        entry["overdue"] += 1

            # 정렬: open 이슈 수 기준 내림차순
            result = []
            for user_id, data in sorted(
                workload.items(),
                key=lambda x: x[1]["open"],
                reverse=True,
            ):
                result.append({
                    "user_id": user_id,
                    "name": data["name"],
                    "open_issues": data["open"],
                    "overdue_issues": data["overdue"],
                })

            return result

        workload = await self._cache.get_or_set(
            cache_key,
            _factory,
            ttl=self._settings.dashboard.cache_ttl_seconds,
        )

        return {
            "project_id": pid,
            "workload": workload,
            "cached_at": datetime.now(),
        }
