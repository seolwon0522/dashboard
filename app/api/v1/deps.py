"""
api/v1/deps.py — FastAPI 의존성 주입
서비스 객체를 엔드포인트에 주입하는 Depends 함수 정의
"""
from fastapi import Request

from app.client.redmine_client import RedmineClient
from app.services.issue_service import IssueService
from app.services.project_service import ProjectService
from app.services.workload_service import WorkloadService


def get_issue_service(request: Request) -> IssueService:
    """IssueService 인스턴스를 Request.app.state에서 꺼내 반환"""
    return request.app.state.issue_service


def get_redmine_client(request: Request) -> RedmineClient:
    """RedmineClient 인스턴스를 Request.app.state에서 꺼내 반환"""
    return request.app.state.redmine_client


def get_project_service(request: Request) -> ProjectService:
    """ProjectService 인스턴스를 Request.app.state에서 꺼내 반환"""
    return request.app.state.project_service


def get_workload_service(request: Request) -> WorkloadService:
    """WorkloadService 인스턴스를 Request.app.state에서 꺼내 반환"""
    return request.app.state.workload_service
