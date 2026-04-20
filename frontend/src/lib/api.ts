// 백엔드 API 호출 함수 모음
// Next.js rewrites()를 통해 /api/v1/* → FastAPI로 프록시됨 (CORS 불필요)
import type {
  DashboardSummary,
  IssueDetail,
  IssueListResponse,
  MemberIssuesResponse,
  ProjectListResponse,
  
  WorkloadResponse,
} from '@/types/dashboard'
import type {
  RedmineConnectionDeleteResponse,
  RedmineConnectionPayload,
  RedmineConnectionSaveResponse,
  RedmineConnectionStatusResponse,
  RedmineConnectionTestResponse,
} from '@/types/redmine-connection'

// 공통 fetch 래퍼: 에러 시 명확한 메시지 반환
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers,
  })

  if (!res.ok) {
    let message = `API 오류 [${res.status}]: ${path}`

    try {
      const data = await res.json() as { detail?: string; message?: string }
      message = data.detail ?? data.message ?? message
    } catch {
      message = `API 오류 [${res.status}]: ${path}`
    }

    throw new Error(message)
  }

  return res.json() as Promise<T>
}

// project_id를 쿼리 파라미터로 변환하는 헬퍼
function withProject(base: string, projectId?: string): string {
  if (!projectId) return base
  return `${base}?project_id=${encodeURIComponent(projectId)}`
}

// 요약 통계 조회
export async function fetchSummary(projectId?: string): Promise<DashboardSummary> {
  return apiFetch(withProject('/api/v1/dashboard/summary', projectId))
}

// 프로젝트 목록 조회 (드롭다운용)
export async function fetchProjects(): Promise<ProjectListResponse> {
  return apiFetch('/api/v1/dashboard/projects')
}

// 담당자별 워크로드 조회
export async function fetchWorkload(projectId?: string): Promise<WorkloadResponse> {
  return apiFetch(withProject('/api/v1/dashboard/workload', projectId))
}

// 전체 이슈 목록 조회 (상태 그룹, 담당자, 마감일, 기한 초과 여부 포함)
export async function fetchAllIssues(projectId?: string): Promise<IssueListResponse> {
  return apiFetch(withProject('/api/v1/dashboard/issues', projectId))
}

// 담당자별 오픈/진행중 이슈 상세 조회
export async function fetchMemberIssues(
  userId: number | null,
  projectId?: string,
): Promise<MemberIssuesResponse> {
  const base = '/api/v1/dashboard/workload/member'
  const params = new URLSearchParams()

  // 미할당(userId === null)이면 unassigned=true, 아니면 user_id 지정
  if (userId === null) {
    params.set('unassigned', 'true')
  } else {
    params.set('user_id', String(userId))
  }
  if (projectId) {
    params.set('project_id', projectId)
  }

  return apiFetch(`${base}?${params.toString()}`)
}

// 단일 이슈 상세 + 변경 이력(journals) 조회
export async function fetchIssueDetail(issueId: number): Promise<IssueDetail> {
  return apiFetch(`/api/v1/dashboard/issues/${issueId}`)
}

export async function fetchConnectionStatus(): Promise<RedmineConnectionStatusResponse> {
  return apiFetch('/api/v1/redmine/connection-status')
}

export async function testRedmineConnection(payload: RedmineConnectionPayload): Promise<RedmineConnectionTestResponse> {
  return apiFetch('/api/v1/redmine/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function saveRedmineConnection(payload: RedmineConnectionPayload): Promise<RedmineConnectionSaveResponse> {
  return apiFetch('/api/v1/redmine/save-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteRedmineConnection(): Promise<RedmineConnectionDeleteResponse> {
  return apiFetch('/api/v1/redmine/connection', {
    method: 'DELETE',
  })
}

export interface WikiExportJobStatus {
  id: string
  project_key: string
  state: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  step: string
  logs: string[]
  error: string | null
  created_at: string
  updated_at: string
  finished_at: string | null
  download_ready: boolean
  downloaded: boolean
}

export async function startProjectWikiExport(projectId: string): Promise<WikiExportJobStatus> {
  return apiFetch(`/api/wiki-export/jobs?project_key=${encodeURIComponent(projectId)}`, {
    method: 'POST',
  })
}

export async function fetchProjectWikiExportStatus(jobId: string): Promise<WikiExportJobStatus> {
  return apiFetch(`/api/wiki-export/jobs/${encodeURIComponent(jobId)}`)
}

export async function downloadProjectWikiHtml(jobId: string, fallbackProjectId: string): Promise<void> {
  const res = await fetch(`/api/wiki-export/jobs/${encodeURIComponent(jobId)}/download`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!res.ok) {
    let message = `API 오류 [${res.status}]: wiki-export`

    try {
      const data = await res.json() as { detail?: string; message?: string }
      message = data.detail ?? data.message ?? message
    } catch {
      message = `API 오류 [${res.status}]: wiki-export`
    }

    throw new Error(message)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const disposition = res.headers.get('content-disposition') ?? ''
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const fallbackFilename = `${fallbackProjectId}-wiki-export.html`
  const filename = encodedFilename ? decodeURIComponent(encodedFilename) : fallbackFilename
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
