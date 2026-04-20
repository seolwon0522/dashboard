"""위키 export 작업 상태 저장소."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import uuid4

JobState = Literal["queued", "running", "completed", "failed"]


@dataclass
class ExportJob:
    id: str
    project_key: str
    state: JobState = "queued"
    progress: int = 0
    step: str = "작업 대기 중"
    logs: list[str] = field(default_factory=list)
    result_html: str | None = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    finished_at: str | None = None
    downloaded: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "project_key": self.project_key,
            "state": self.state,
            "progress": self.progress,
            "step": self.step,
            "logs": self.logs[-12:],
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "finished_at": self.finished_at,
            "download_ready": self.result_html is not None,
            "downloaded": self.downloaded,
        }


class ExportJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, ExportJob] = {}

    def create(self, project_key: str) -> ExportJob:
        job = ExportJob(id=uuid4().hex, project_key=project_key)
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> ExportJob | None:
        return self._jobs.get(job_id)
