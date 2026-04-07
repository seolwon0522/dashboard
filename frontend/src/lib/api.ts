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

// 공통 fetch 래퍼: 에러 시 명확한 메시지 반환
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    // 캐시하지 않음 — 항상 최신 데이터 요청
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`API 오류 [${res.status}]: ${path}`)
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
