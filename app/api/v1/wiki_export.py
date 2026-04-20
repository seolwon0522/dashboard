"""위키 HTML export 엔드포인트."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from app.services.wiki_export_jobs import ExportJob, ExportJobStore
from app.services.wiki_export_service import WikiExportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wiki-export", tags=["wiki-export"])


def _append_job_log(job: ExportJob, message: str, progress: int | None = None, step: str | None = None) -> None:
    timestamp = datetime.now().strftime("%H:%M:%S")
    job.logs.append(f"[{timestamp}] {message}")
    job.updated_at = datetime.now().isoformat()
    if progress is not None:
        job.progress = max(0, min(100, progress))
    if step is not None:
        job.step = step


async def _run_export_job(request_app, job_id: str) -> None:
    store: ExportJobStore = request_app.state.export_job_store
    service: WikiExportService = request_app.state.wiki_export_service
    job = store.get(job_id)
    if job is None:
        return

    job.state = "running"
    _append_job_log(job, "위키 export 작업을 시작했습니다.", progress=2, step="초기화")

    try:
        html = await service.export_project_wiki_html(
            job.project_key,
            on_progress=lambda message, progress=None, step=None: _append_job_log(job, message, progress, step),
        )
        job.result_html = html
        job.state = "completed"
        job.finished_at = datetime.now().isoformat()
        _append_job_log(job, "HTML 파일 생성이 완료되었습니다. 다운로드를 준비합니다.", progress=100, step="완료")
    except Exception as exc:
        logger.exception("wiki export job failed: %s", job.project_key)
        job.state = "failed"
        job.error = str(exc)
        job.finished_at = datetime.now().isoformat()
        _append_job_log(job, f"작업이 실패했습니다: {exc}", step="실패")


@router.post("/jobs")
async def create_export_job(request: Request, project_key: str = Query(..., min_length=1)):
    store: ExportJobStore = request.app.state.export_job_store
    job = store.create(project_key)
    _append_job_log(job, f"{project_key} 위키 문서 export 작업을 생성했습니다.", progress=0, step="대기")
    asyncio.create_task(_run_export_job(request.app, job.id))
    return job.to_dict()


@router.get("/jobs/{job_id}")
async def get_export_job_status(request: Request, job_id: str):
    store: ExportJobStore = request.app.state.export_job_store
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Wiki export job not found.")
    return job.to_dict()


@router.get("/jobs/{job_id}/download")
async def download_export_result(request: Request, job_id: str):
    store: ExportJobStore = request.app.state.export_job_store
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Wiki export job not found.")
    if job.state != "completed" or job.result_html is None:
        raise HTTPException(status_code=409, detail="Wiki export job is not ready for download.")

    filename = f"{job.project_key}-wiki-export.html"
    quoted_filename = quote(filename)
    job.downloaded = True
    _append_job_log(job, "다운로드 요청을 처리했습니다.")

    return Response(
        content=job.result_html,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"},
    )
