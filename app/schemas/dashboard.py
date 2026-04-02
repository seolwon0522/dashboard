"""
schemas/dashboard.py — 대시보드 API 응답 Pydantic 모델
"""
from datetime import datetime

from pydantic import BaseModel, Field


class StatusGroupCount(BaseModel):
    """상태 그룹별 이슈 수"""
    open: int = 0
    in_progress: int = 0
    closed: int = 0


class DashboardSummary(BaseModel):
    """GET /api/v1/dashboard/summary 응답"""
    project_id: str
    total: int
    by_status_group: dict[str, int]
    overdue: int
    cached_at: datetime


class ProjectIssueCount(BaseModel):
    """프로젝트별 이슈 수"""
    id: str
    name: str
    open_issues: int = 0


class ProjectListResponse(BaseModel):
    """GET /api/v1/dashboard/projects 응답"""
    projects: list[ProjectIssueCount]
    cached_at: datetime


class OverdueIssueItem(BaseModel):
    """기한 초과 이슈 항목"""
    id: int
    subject: str
    due_date: str
    assigned_to: str | None = None
    status: str
    priority: str | None = None
    days_overdue: int


class OverdueIssuesResponse(BaseModel):
    """GET /api/v1/dashboard/issues/overdue 응답"""
    project_id: str
    count: int
    issues: list[OverdueIssueItem]
    cached_at: datetime


class WorkloadItem(BaseModel):
    """담당자별 워크로드 항목"""
    user_id: int | None = None
    name: str
    open_issues: int = 0
    overdue_issues: int = 0


class WorkloadResponse(BaseModel):
    """GET /api/v1/dashboard/workload 응답"""
    project_id: str
    workload: list[WorkloadItem]
    cached_at: datetime


class CacheStatsResponse(BaseModel):
    """캐시 통계 응답"""
    total_keys: int
    active_keys: int
    expired_keys: int


class CacheInvalidateResponse(BaseModel):
    """캐시 무효화 응답"""
    deleted: int


# ── 담당자별 이슈 상세 ──

class MemberIssueItem(BaseModel):
    """담당자별 이슈 항목 (오픈/진행중 전체)"""
    id: int
    subject: str
    status: str
    priority: str | None = None
    due_date: str | None = None
    is_overdue: bool = False
    days_overdue: int = 0
    url: str


class MemberIssuesResponse(BaseModel):
    """GET /api/v1/dashboard/workload/member 응답"""
    project_id: str
    user_id: int | None = None
    user_name: str
    total: int
    overdue_count: int
    issues: list[MemberIssueItem]
    cached_at: datetime
