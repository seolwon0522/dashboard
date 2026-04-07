import type {
  AssigneeFilter,
  DashboardFilter,
  DashboardSummary,
  IssueListItem,
  IssuePreset,
} from '@/types/dashboard'

export type DashboardTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success'

export interface KpiCardModel {
  id: string
  label: string
  value: string
  note: string
  tone: DashboardTone
  statusGroup?: string | null
  preset?: IssuePreset | null
}

export interface ActionBucketModel {
  id: IssuePreset
  label: string
  description: string
  count: number
  tone: DashboardTone
  issues: IssueListItem[]
  emptyLabel: string
}

export interface CapacityMemberModel {
  key: string
  assignee: AssigneeFilter
  openCount: number
  inProgressCount: number
  highPriorityCount: number
  dueSoonCount: number
  overdueCount: number
  staleCount: number
  closedRecentlyCount: number
  riskScore: number
  band: 'balanced' | 'watch' | 'stretched'
}

export interface AgingBucketModel {
  label: string
  count: number
}

export interface WeeklyFlowPoint {
  label: string
  created: number
  closed: number
}

export interface HealthModel {
  score: number
  label: string
  tone: DashboardTone
  summary: string
  activeCount: number
  completionRate: number
  closedRecentlyCount: number
  createdRecentlyCount: number
  flowBalance: number
  overdueCount: number
  staleCount: number
  unassignedCount: number
  averageCycleDays: number | null
  agingBuckets: AgingBucketModel[]
  weeklyFlow: WeeklyFlowPoint[]
}

export interface ExplorerPresetModel {
  id: IssuePreset | null
  label: string
  count: number
}

export interface IssueSignal {
  label: string
  tone: DashboardTone
}

export interface DashboardModel {
  kpis: KpiCardModel[]
  actions: ActionBucketModel[]
  capacity: CapacityMemberModel[]
  health: HealthModel
  explorerPresets: ExplorerPresetModel[]
}

const HIGH_PRIORITY = new Set(['Immediate', 'Urgent', 'High'])
const ACTIVE_STATUS_GROUPS = new Set(['open', 'in_progress', 'other'])

function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay)
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = startOfDay(date)
  start.setDate(start.getDate() + diff)
  return start
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function isHighPriorityIssue(issue: IssueListItem): boolean {
  return issue.priority !== null && HIGH_PRIORITY.has(issue.priority) && issue.status_group !== 'closed'
}

export function isClosedRecently(issue: IssueListItem): boolean {
  return issue.status_group === 'closed' && (issue.days_since_update ?? Number.POSITIVE_INFINITY) <= 7
}

export function matchesIssuePreset(issue: IssueListItem, preset: IssuePreset | null): boolean {
  if (!preset) return true

  switch (preset) {
    case 'attention':
      return (
        issue.is_overdue ||
        issue.is_due_soon ||
        issue.is_stale ||
        isHighPriorityIssue(issue) ||
        (issue.status_group !== 'closed' && issue.assigned_to_id === null)
      )
    case 'overdue':
      return issue.is_overdue
    case 'due_soon':
      return issue.is_due_soon
    case 'stale':
      return issue.is_stale
    case 'high_priority':
      return isHighPriorityIssue(issue)
    case 'unassigned':
      return issue.status_group !== 'closed' && issue.assigned_to_id === null
    case 'closed_recently':
      return isClosedRecently(issue)
    default:
      return true
  }
}

export function getIssueSignals(issue: IssueListItem): IssueSignal[] {
  const signals: IssueSignal[] = []

  if (issue.is_overdue) {
    signals.push({ label: `지연 ${issue.days_overdue}일`, tone: 'danger' })
  } else if (issue.is_due_soon && issue.days_until_due !== null) {
    const dueLabel = issue.days_until_due === 0 ? '오늘 마감' : `${issue.days_until_due}일 남음`
    signals.push({ label: dueLabel, tone: 'warning' })
  }

  if (issue.is_stale && issue.days_since_update !== null) {
    signals.push({ label: `정체 ${issue.days_since_update}일`, tone: 'warning' })
  }

  if (isHighPriorityIssue(issue)) {
    signals.push({ label: '높은 우선순위', tone: 'danger' })
  }

  if (issue.status_group !== 'closed' && issue.assigned_to_id === null) {
    signals.push({ label: '미할당', tone: 'neutral' })
  }

  if (issue.status_group === 'closed' && isClosedRecently(issue)) {
    signals.push({ label: '이번 주 완료', tone: 'success' })
  }

  return signals
}

export function applyDashboardFilter(issues: IssueListItem[], filter: DashboardFilter): IssueListItem[] {
  return issues.filter((issue) => {
    if (filter.statusGroup && issue.status_group !== filter.statusGroup) {
      return false
    }

    if (filter.assignee) {
      const matchAssignee = filter.assignee.id === null
        ? issue.assigned_to_id === null
        : issue.assigned_to_id === filter.assignee.id
      if (!matchAssignee) {
        return false
      }
    }

    return matchesIssuePreset(issue, filter.preset)
  })
}

function buildCapacity(issues: IssueListItem[]): CapacityMemberModel[] {
  const members = new Map<string, CapacityMemberModel>()

  function getMember(issue: IssueListItem): CapacityMemberModel {
    const assignee: AssigneeFilter = {
      id: issue.assigned_to_id,
      name: issue.assigned_to ?? '미할당',
    }
    const key = String(assignee.id ?? 'unassigned')
    const existing = members.get(key)
    if (existing) return existing

    const model: CapacityMemberModel = {
      key,
      assignee,
      openCount: 0,
      inProgressCount: 0,
      highPriorityCount: 0,
      dueSoonCount: 0,
      overdueCount: 0,
      staleCount: 0,
      closedRecentlyCount: 0,
      riskScore: 0,
      band: 'balanced',
    }
    members.set(key, model)
    return model
  }

  issues.forEach((issue) => {
    const member = getMember(issue)

    if (issue.status_group !== 'closed') {
      member.openCount += 1
      if (issue.status_group === 'in_progress') {
        member.inProgressCount += 1
      }
      if (issue.is_due_soon) {
        member.dueSoonCount += 1
      }
      if (issue.is_overdue) {
        member.overdueCount += 1
      }
      if (issue.is_stale) {
        member.staleCount += 1
      }
      if (isHighPriorityIssue(issue)) {
        member.highPriorityCount += 1
      }
    }

    if (isClosedRecently(issue)) {
      member.closedRecentlyCount += 1
    }
  })

  return Array.from(members.values())
    .map((member) => {
      const riskScore =
        member.overdueCount * 4 +
        member.highPriorityCount * 3 +
        member.dueSoonCount * 2 +
        member.staleCount * 2 +
        Math.max(0, member.openCount - 5)
      const band: CapacityMemberModel['band'] = riskScore >= 14 ? 'stretched' : riskScore >= 7 ? 'watch' : 'balanced'

      return {
        ...member,
        riskScore,
        band,
      }
    })
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore
      }
      return right.openCount - left.openCount
    })
}

function buildWeeklyFlow(issues: IssueListItem[]): WeeklyFlowPoint[] {
  const today = new Date()
  const currentWeek = startOfWeek(today)
  const weekStarts = Array.from({ length: 6 }, (_, index) => {
    const weekStart = new Date(currentWeek)
    weekStart.setDate(currentWeek.getDate() - (5 - index) * 7)
    return weekStart
  })

  return weekStarts.map((weekStart) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const created = issues.filter((issue) => {
      const createdOn = parseLocalDate(issue.created_on)
      return createdOn !== null && createdOn >= weekStart && createdOn <= weekEnd
    }).length

    const closed = issues.filter((issue) => {
      if (issue.status_group !== 'closed') return false
      const updatedOn = parseLocalDate(issue.updated_on)
      return updatedOn !== null && updatedOn >= weekStart && updatedOn <= weekEnd
    }).length

    return {
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      created,
      closed,
    }
  })
}

function buildHealth(summary: DashboardSummary, issues: IssueListItem[]): HealthModel {
  const activeIssues = issues.filter((issue) => ACTIVE_STATUS_GROUPS.has(issue.status_group))
  const overdueCount = activeIssues.filter((issue) => issue.is_overdue).length
  const staleCount = activeIssues.filter((issue) => issue.is_stale).length
  const unassignedCount = activeIssues.filter((issue) => issue.assigned_to_id === null).length
  const closedRecentlyCount = issues.filter(isClosedRecently).length
  const createdRecentlyCount = issues.filter((issue) => {
    const createdOn = parseLocalDate(issue.created_on)
    if (createdOn === null) return false
    const age = diffDays(createdOn, new Date())
    return age >= 0 && age <= 7
  }).length
  const completionRate = summary.total > 0
    ? Math.round(((summary.by_status_group.closed ?? 0) / summary.total) * 100)
    : 0
  const flowBalance = closedRecentlyCount - createdRecentlyCount

  const cycleDays = issues
    .filter((issue) => issue.status_group === 'closed')
    .map((issue) => {
      const createdOn = parseLocalDate(issue.created_on)
      const updatedOn = parseLocalDate(issue.updated_on)
      if (!createdOn || !updatedOn) return null
      return diffDays(createdOn, updatedOn)
    })
    .filter((value): value is number => value !== null)

  const averageCycleDays = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((sum, value) => sum + value, 0) / cycleDays.length)
    : null

  const score = clamp(
    100 - overdueCount * 5 - staleCount * 3 - unassignedCount * 2 + flowBalance * 2,
    18,
    96,
  )

  const tone: DashboardTone = score >= 75 ? 'success' : score >= 55 ? 'warning' : 'danger'
  const label = score >= 75 ? '양호' : score >= 55 ? '주의 필요' : '위험'

  const summaryText = overdueCount > 0
    ? `현재 위험의 핵심은 기한 초과 ${overdueCount}건입니다.`
    : flowBalance >= 0
      ? '최근 유입 대비 처리 속도가 유지되고 있습니다.'
      : '최근 완료보다 신규 유입이 더 빠르게 늘고 있습니다.'

  const agingBuckets: AgingBucketModel[] = [
    { label: '0-3d', count: activeIssues.filter((issue) => (issue.days_since_update ?? -1) <= 3).length },
    { label: '4-7d', count: activeIssues.filter((issue) => (issue.days_since_update ?? -1) >= 4 && (issue.days_since_update ?? -1) <= 7).length },
    { label: '8-14d', count: activeIssues.filter((issue) => (issue.days_since_update ?? -1) >= 8 && (issue.days_since_update ?? -1) <= 14).length },
    { label: '15d+', count: activeIssues.filter((issue) => (issue.days_since_update ?? -1) >= 15).length },
  ]

  return {
    score,
    label,
    tone,
    summary: summaryText,
    activeCount: activeIssues.length,
    completionRate,
    closedRecentlyCount,
    createdRecentlyCount,
    flowBalance,
    overdueCount,
    staleCount,
    unassignedCount,
    averageCycleDays,
    agingBuckets,
    weeklyFlow: buildWeeklyFlow(issues),
  }
}

export function buildDashboardModel(summary: DashboardSummary, issues: IssueListItem[]): DashboardModel {
  const activeIssues = issues.filter((issue) => ACTIVE_STATUS_GROUPS.has(issue.status_group))
  const overdueIssues = activeIssues.filter((issue) => issue.is_overdue)
  const dueSoonIssues = activeIssues.filter((issue) => issue.is_due_soon)
  const staleIssues = activeIssues.filter((issue) => issue.is_stale)
  const highPriorityIssues = activeIssues.filter(isHighPriorityIssue)
  const unassignedIssues = activeIssues.filter((issue) => issue.assigned_to_id === null)
  const closedRecently = issues.filter(isClosedRecently)
  const closedTotal = summary.by_status_group.closed ?? 0
  const attentionCount = new Set(
    activeIssues
      .filter((issue) => matchesIssuePreset(issue, 'attention'))
      .map((issue) => issue.id),
  ).size

  const kpis: KpiCardModel[] = [
    {
      id: 'active',
      label: '활성 이슈',
      value: String(activeIssues.length),
      note: `전체 ${summary.total}건`,
      tone: 'neutral',
    },
    {
      id: 'in_progress',
      label: '진행 중',
      value: String(summary.by_status_group.in_progress ?? 0),
      note: '현재 진행 중인 실행 작업',
      tone: 'info',
      statusGroup: 'in_progress',
    },
    {
      id: 'overdue',
      label: '기한 초과',
      value: String(overdueIssues.length),
      note: overdueIssues.length > 0 ? '기한이 지났지만 아직 미해결' : '지연된 작업 없음',
      tone: overdueIssues.length > 0 ? 'danger' : 'success',
      preset: 'overdue',
    },
    {
      id: 'due_soon',
      label: '이번 주 마감',
      value: String(dueSoonIssues.length),
      note: '향후 7일 내 마감 예정',
      tone: dueSoonIssues.length > 0 ? 'warning' : 'neutral',
      preset: 'due_soon',
    },
    {
      id: 'stale',
      label: '정체 이슈',
      value: String(staleIssues.length),
      note: '7일 이상 업데이트 없음',
      tone: staleIssues.length > 0 ? 'warning' : 'success',
      preset: 'stale',
    },
    {
      id: 'closed_recently',
      label: '최근 완료',
      value: String(closedRecently.length),
      note: `전체 완료 ${closedTotal}건`,
      tone: 'success',
      preset: 'closed_recently',
    },
  ]

  const actions: ActionBucketModel[] = [
    {
      id: 'overdue',
      label: '기한 초과 작업',
      description: '이미 마감일이 지났지만 아직 열려 있는 이슈입니다.',
      count: overdueIssues.length,
      tone: overdueIssues.length > 0 ? 'danger' : 'success',
      issues: overdueIssues.sort((left, right) => right.days_overdue - left.days_overdue).slice(0, 5),
      emptyLabel: '기한 초과 이슈가 없습니다. 현재 마감 관리는 안정적입니다.',
    },
    {
      id: 'due_soon',
      label: '이번 주 마감',
      description: '이번 주 안에 확인이 필요한 임박 일정입니다.',
      count: dueSoonIssues.length,
      tone: dueSoonIssues.length > 0 ? 'warning' : 'success',
      issues: dueSoonIssues
        .sort((left, right) => (left.days_until_due ?? 99) - (right.days_until_due ?? 99))
        .slice(0, 5),
      emptyLabel: '가까운 마감 일정이 없습니다. 탐색기에서 다음 일정을 점검하세요.',
    },
    {
      id: 'stale',
      label: '정체 이슈',
      description: '최근 움직임이 없는 활성 작업입니다.',
      count: staleIssues.length,
      tone: staleIssues.length > 0 ? 'warning' : 'success',
      issues: staleIssues.sort((left, right) => (right.days_since_update ?? 0) - (left.days_since_update ?? 0)).slice(0, 5),
      emptyLabel: '정체된 이슈가 없습니다. 현재 작업 흐름이 유지되고 있습니다.',
    },
    {
      id: 'high_priority',
      label: '높은 우선순위',
      description: '지속적으로 주시해야 하는 긴급 이슈입니다.',
      count: highPriorityIssues.length,
      tone: highPriorityIssues.length > 0 ? 'danger' : 'neutral',
      issues: highPriorityIssues.slice(0, 5),
      emptyLabel: '현재 높은 우선순위의 활성 이슈가 없습니다.',
    },
    {
      id: 'unassigned',
      label: '미할당 작업',
      description: '담당자가 명확하지 않은 이슈입니다.',
      count: unassignedIssues.length,
      tone: unassignedIssues.length > 0 ? 'warning' : 'success',
      issues: unassignedIssues.slice(0, 5),
      emptyLabel: '현재 활성 작업에는 모두 담당자가 지정되어 있습니다.',
    },
  ]

  const explorerPresets: ExplorerPresetModel[] = [
    { id: null, label: '전체 이슈', count: issues.length },
    { id: 'attention', label: '조치 필요', count: attentionCount },
    { id: 'overdue', label: '기한 초과', count: overdueIssues.length },
    { id: 'due_soon', label: '이번 주 마감', count: dueSoonIssues.length },
    { id: 'stale', label: '정체', count: staleIssues.length },
    { id: 'high_priority', label: '높은 우선순위', count: highPriorityIssues.length },
    { id: 'unassigned', label: '미할당', count: unassignedIssues.length },
    { id: 'closed_recently', label: '최근 완료 7일', count: closedRecently.length },
  ]

  return {
    kpis,
    actions,
    capacity: buildCapacity(issues),
    health: buildHealth(summary, issues),
    explorerPresets,
  }
}