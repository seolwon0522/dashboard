"""
services/issue_service.py — 이슈 집계 비즈니스 로직
상태 그룹 분류, overdue 판단, 요약 통계 생성
"""
import logging
from collections import defaultdict
from datetime import date, datetime
from typing import Any

import textile

from app.client.redmine_client import RedmineClient
from app.core.cache import TTLCache
from app.core.config import Settings
from app.services.utils import calc_overdue

logger = logging.getLogger(__name__)


def _textile_to_html(text: str | None) -> str | None:
    """Textile 텍스트를 HTML로 변환. 실패 시 None 반환."""
    if not text:
        return None
    try:
        return textile.textile(text)
    except Exception:
        logger.debug("Textile 변환 실패, 원문 반환")
        return None


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

    async def get_all_issues(self, project_id: str | None = None) -> dict:
        """
        전체 이슈 목록 반환 (상태 그룹, 담당자, 기한 초과 여부 포함)
        기존 issues:{project_id} 캐시를 재사용하여 추가 API 호출 없음
        """
        pid = self._resolve_project(project_id)
        issues = await self._fetch_project_issues(pid)

        today = date.today()
        base_url = self._settings.redmine.base_url
        overdue_exclude = self._settings.get_excluded_status_ids(
            self._settings.dashboard.overdue_rule.exclude_status_groups
        )

        result = []
        for issue in issues:
            status_id = issue.get("status", {}).get("id")
            group = self._settings.get_status_group(status_id) or "other"
            assigned = issue.get("assigned_to")
            due_str = issue.get("due_date")
            updated_raw = issue.get("updated_on") or ""

            is_overdue = False
            days_overdue = 0
            if due_str and status_id not in overdue_exclude:
                is_overdue, days_overdue = calc_overdue(due_str, today)

            result.append({
                "id": issue["id"],
                "subject": issue.get("subject", ""),
                "status": issue.get("status", {}).get("name", ""),
                "status_group": group,
                "priority": issue.get("priority", {}).get("name"),
                "assigned_to": assigned.get("name") if assigned else None,
                "assigned_to_id": assigned.get("id") if assigned else None,
                "due_date": due_str,
                "updated_on": updated_raw[:10] if updated_raw else None,
                "is_overdue": is_overdue,
                "days_overdue": days_overdue,
                "url": f"{base_url}/issues/{issue['id']}",
            })

        # 최근 업데이트 순 정렬
        result.sort(key=lambda x: x.get("updated_on") or "", reverse=True)

        return {
            "project_id": pid,
            "total": len(result),
            "issues": result,
            "cached_at": datetime.now(),
        }

    async def get_issue_detail(self, issue_id: int) -> dict:
        """
        단일 이슈 상세 + 변경 이력(journals) 반환
        Redmine API: GET /issues/{id}.json?include=journals
        """
        cache_key = f"issue_detail:{issue_id}"

        async def _factory():
            return await self._client.fetch_issue_detail(issue_id, include="journals,attachments")

        raw = await self._cache.get_or_set(
            cache_key,
            _factory,
            ttl=60,  # 상세는 짧은 TTL
        )

        base_url = self._settings.redmine.base_url

        # 기본 정보 정규화
        assigned = raw.get("assigned_to")
        author = raw.get("author")
        tracker = raw.get("tracker")
        category = raw.get("category")
        version = raw.get("fixed_version")
        status = raw.get("status", {})
        priority = raw.get("priority", {})

        detail: dict[str, Any] = {
            "id": raw.get("id"),
            "subject": raw.get("subject", ""),
            "description": raw.get("description") or None,
            "description_html": _textile_to_html(raw.get("description")),
            "status": status.get("name", ""),
            "status_id": status.get("id"),
            "status_group": self._settings.get_status_group(status.get("id", 0)) or "other",
            "priority": priority.get("name"),
            "assigned_to": assigned.get("name") if assigned else None,
            "assigned_to_id": assigned.get("id") if assigned else None,
            "author": author.get("name") if author else None,
            "tracker": tracker.get("name") if tracker else None,
            "category": category.get("name") if category else None,
            "version": version.get("name") if version else None,
            "start_date": raw.get("start_date"),
            "due_date": raw.get("due_date"),
            "done_ratio": raw.get("done_ratio", 0),
            "created_on": raw.get("created_on"),
            "updated_on": raw.get("updated_on"),
            "url": f"{base_url}/issues/{raw.get('id')}",
            "redmine_base_url": base_url,
            "attachments": [],
        }

        attachments = raw.get("attachments", [])
        detail["attachments"] = [
            {
                "id": attachment.get("id"),
                "filename": attachment.get("filename", "attachment"),
                "filesize": attachment.get("filesize"),
                "content_type": attachment.get("content_type"),
                "content_url": attachment.get("content_url", ""),
            }
            for attachment in attachments
            if attachment.get("id") and attachment.get("content_url")
        ]

        # 변경 이력 (journals) 정규화
        journals = raw.get("journals", [])
        timeline: list[dict] = []
        for journal in journals:
            j_user = journal.get("user", {})
            notes = journal.get("notes") or None
            created = journal.get("created_on", "")

            details = journal.get("details", [])
            changes: list[dict] = []
            for d in details:
                changes.append({
                    "field": d.get("name", ""),
                    "property": d.get("property", ""),
                    "old_value": d.get("old_value"),
                    "new_value": d.get("new_value"),
                })

            timeline.append({
                "id": journal.get("id"),
                "user": j_user.get("name", ""),
                "created_on": created,
                "notes": notes,
                "notes_html": _textile_to_html(notes),
                "changes": changes,
            })

        detail["journals"] = timeline

        return detail
