// 백엔드 API 응답 타입 정의
// 백엔드 schemas/dashboard.py의 Pydantic 모델과 1:1 대응

// GET /api/v1/dashboard/summary 응답
export interface DashboardSummary {
  project_id: string
  total: number
  by_status_group: Record<string, number>
  overdue: number
  cached_at: string
}

// GET /api/v1/dashboard/projects 응답 내 항목
export interface ProjectItem {
  id: string
  name: string
  open_issues: number
}

export interface ProjectListResponse {
  projects: ProjectItem[]
  cached_at: string
}

// GET /api/v1/dashboard/issues/overdue 응답 내 항목
export interface OverdueIssue {
  id: number
  subject: string
  due_date: string
  assigned_to: string | null
  status: string
  priority: string | null
  days_overdue: number
}

export interface OverdueIssuesResponse {
  project_id: string
  count: number
  issues: OverdueIssue[]
  cached_at: string
}

// GET /api/v1/dashboard/workload 응답 내 항목
export interface WorkloadItem {
  user_id: number | null
  name: string
  open_issues: number
  overdue_issues: number
}

export interface WorkloadResponse {
  project_id: string
  workload: WorkloadItem[]
  cached_at: string
}

// GET /api/v1/dashboard/workload/member 응답 내 항목
export interface MemberIssueItem {
  id: number
  subject: string
  status: string
  priority: string | null
  due_date: string | null
  is_overdue: boolean
  days_overdue: number
  url: string
}

export interface MemberIssuesResponse {
  project_id: string
  user_id: number | null
  user_name: string
  total: number
  overdue_count: number
  issues: MemberIssueItem[]
  cached_at: string
}
