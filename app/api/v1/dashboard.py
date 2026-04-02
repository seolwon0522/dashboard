"""
api/v1/dashboard.py — 대시보드 엔드포인트
/api/v1/dashboard/* 하위 4개 엔드포인트 구현
"""
from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import get_issue_service, get_project_service, get_workload_service
from app.schemas.dashboard import (
    DashboardSummary,
    OverdueIssuesResponse,
    ProjectListResponse,
    WorkloadResponse,
)
from app.services.issue_service import IssueService
from app.services.project_service import ProjectService
from app.services.workload_service import WorkloadService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    project_id: str | None = Query(None, description="프로젝트 ID (미지정 시 config 기본값)"),
    service: IssueService = Depends(get_issue_service),
):
    """대시보드 요약: 전체/상태그룹별 이슈 수, 기한초과 수"""
    return await service.get_summary(project_id)


@router.get("/projects", response_model=ProjectListResponse)
async def get_projects(
    service: ProjectService = Depends(get_project_service),
):
    """프로젝트 목록 + 각 프로젝트 open 이슈 수"""
    return await service.get_project_list()


@router.get("/issues/overdue", response_model=OverdueIssuesResponse)
async def get_overdue_issues(
    project_id: str | None = Query(None, description="프로젝트 ID (미지정 시 config 기본값)"),
    service: IssueService = Depends(get_issue_service),
):
    """기한 초과 이슈 목록 (초과일 기준 내림차순)"""
    return await service.get_overdue_issues(project_id)


@router.get("/workload", response_model=WorkloadResponse)
async def get_workload(
    project_id: str | None = Query(None, description="프로젝트 ID (미지정 시 config 기본값)"),
    service: WorkloadService = Depends(get_workload_service),
):
    """담당자별 워크로드: open 이슈 수 + overdue 이슈 수"""
    return await service.get_workload(project_id)
