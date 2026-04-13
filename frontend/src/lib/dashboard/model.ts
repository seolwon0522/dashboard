import type { DashboardSummary, IssueListItem } from '@/types/dashboard'
import type {
  ActionBucketModel,
  CapacityMemberModel,
  DashboardModel,
  DashboardSummaryViewModel,
  DashboardThresholdSettings,
  ExplorerPresetModel,
  KpiCardModel,
  StableOperationalState,
  StatusSnapshotModel,
} from '@/types/dashboard-derived'
import { diffDays, formatDaysAgo, parseLocalDate } from '@/lib/dashboard/date'
import { buildAssigneeInsights } from '@/lib/dashboard/insights'
import { buildHealthModel } from '@/lib/dashboard/scoring'
import { evaluateIssueRisk, getToneForFlow, isActiveIssue, isHighPriorityIssue, matchesIssuePreset } from '@/lib/dashboard/thresholds'

function buildSummaryCards(summary: DashboardSummary, issues: IssueListItem[], settings: DashboardThresholdSettings): DashboardSummaryViewModel {
  const activeIssues = issues.filter(isActiveIssue)
  const inProgressCount = summary.by_status_group.in_progress ?? 0
  const attentionCount = activeIssues.filter((issue) => matchesIssuePreset(issue, 'attention', settings)).length
  const weeklyCheckCount = activeIssues.filter((issue) => {
    const risk = evaluateIssueRisk(issue, settings)
    return risk.isDueSoon || risk.isStale
  }).length
  const recentCreatedCount = issues.filter((issue) => {
    const createdOn = parseLocalDate(issue.created_on)
    return !!createdOn && diffDays(createdOn, new Date()) <= settings.recentActivityDays
  }).length
  const recentCompletedCount = issues.filter((issue) => evaluateIssueRisk(issue, settings).isRecentlyCompleted).length
  const flowBalance = recentCompletedCount - recentCreatedCount

  const cards: KpiCardModel[] = [
    {
      id: 'attention',
      label: '긴급 조치 필요',
      value: String(attentionCount),
      note: attentionCount > 0 ? '지연, 정체, 미할당, 높은 우선순위가 겹친 항목' : '지금은 긴급 조치보다 흐름 유지 점검이 우선입니다.',
      tone: attentionCount > 0 ? 'warning' : 'success',
      preset: 'attention',
    },
    {
      id: 'in_progress',
      label: '현재 진행 중',
      value: String(inProgressCount),
      note: `활성 ${activeIssues.length}건 중 실제로 움직이고 있는 작업`,
      tone: inProgressCount > 0 ? 'info' : 'neutral',
      statusGroup: 'in_progress',
    },
    {
      id: 'weekly_check',
      label: '이번 주 확인 필요',
      value: String(weeklyCheckCount),
      note: `${settings.dueSoonDays}일 이내 마감 또는 ${settings.staleDays}일 이상 정체된 작업`,
      tone: weeklyCheckCount > 0 ? 'warning' : 'success',
      preset: weeklyCheckCount > 0 ? 'due_soon' : 'closed_recently',
    },
    {
      id: 'flow',
      label: `최근 ${settings.recentCompletionDays}일 처리 흐름`,
      value: `${flowBalance > 0 ? '+' : ''}${flowBalance}`,
      note: `유입 ${recentCreatedCount}건 대비 완료 ${recentCompletedCount}건`,
      tone: getToneForFlow(flowBalance),
      preset: 'closed_recently',
    },
  ]

  return {
    cards,
    headline: attentionCount > 0
      ? `오늘 바로 정리해야 할 운영 신호 ${attentionCount}건이 쌓여 있습니다.`
      : '긴급 큐는 비어 있습니다. 지금은 진행 흐름과 다음 병목 후보를 짧게 확인하면 됩니다.',
  }
}

function buildActions(issues: IssueListItem[], settings: DashboardThresholdSettings): ActionBucketModel[] {
  const activeIssues = issues.filter(isActiveIssue)
  const overdueIssues = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isOverdue)
  const dueSoonIssues = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isDueSoon)
  const staleIssues = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isStale)
  const highPriorityIssues = activeIssues.filter(isHighPriorityIssue)
  const unassignedIssues = activeIssues.filter((issue) => issue.assigned_to_id === null)

  return [
    {
      id: 'overdue',
      label: '기한 초과 작업',
      description: '마감이 이미 지난 작업입니다. 일정 재조정이나 담당 확인이 먼저 필요합니다.',
      count: overdueIssues.length,
      tone: overdueIssues.length > 0 ? 'danger' : 'success',
      issues: overdueIssues.sort((left, right) => evaluateIssueRisk(right, settings).daysOverdue - evaluateIssueRisk(left, settings).daysOverdue).slice(0, 5),
      emptyLabel: '기한 초과 이슈가 없습니다. 현재 마감 관리 기준은 안정적입니다.',
    },
    {
      id: 'due_soon',
      label: '임박 일정',
      description: '이번 주 안에 다시 보지 않으면 지연으로 넘어갈 수 있는 작업입니다.',
      count: dueSoonIssues.length,
      tone: dueSoonIssues.length > 0 ? 'warning' : 'success',
      issues: dueSoonIssues.sort((left, right) => (evaluateIssueRisk(left, settings).daysUntilDue ?? 999) - (evaluateIssueRisk(right, settings).daysUntilDue ?? 999)).slice(0, 5),
      emptyLabel: '임박 일정은 없습니다. 다음으로는 정체와 담당 분산을 보시면 됩니다.',
    },
    {
      id: 'stale',
      label: '정체 이슈',
      description: '업데이트가 끊긴 작업입니다. 현재 진행 여부와 막힌 지점을 다시 확인해야 합니다.',
      count: staleIssues.length,
      tone: staleIssues.length > 0 ? 'warning' : 'success',
      issues: staleIssues.sort((left, right) => (evaluateIssueRisk(right, settings).daysSinceUpdate ?? 0) - (evaluateIssueRisk(left, settings).daysSinceUpdate ?? 0)).slice(0, 5),
      emptyLabel: '정체 이슈가 없습니다. 현재 작업 흐름은 기준 내에서 유지되고 있습니다.',
    },
    {
      id: 'high_priority',
      label: '높은 우선순위',
      description: '우선순위가 높은 작업입니다. 다른 신호와 겹치면 먼저 처리해야 합니다.',
      count: highPriorityIssues.length,
      tone: highPriorityIssues.length > 0 ? 'danger' : 'neutral',
      issues: highPriorityIssues.slice(0, 5),
      emptyLabel: '높은 우선순위 활성 이슈는 없습니다.',
    },
    {
      id: 'unassigned',
      label: '미할당 작업',
      description: '실행 책임이 비어 있습니다. 소유권부터 정해야 실제 진행이 시작됩니다.',
      count: unassignedIssues.length,
      tone: unassignedIssues.length > 0 ? 'warning' : 'success',
      issues: unassignedIssues.slice(0, 5),
      emptyLabel: '현재 활성 작업에는 모두 담당자가 지정되어 있습니다.',
    },
  ]
}

function buildStatusSnapshot(issues: IssueListItem[], settings: DashboardThresholdSettings): StatusSnapshotModel {
  const activeIssues = issues.filter(isActiveIssue)
  const overdueCount = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isOverdue).length
  const dueSoonCount = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isDueSoon).length
  const staleCount = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isStale).length
  const unassignedCount = activeIssues.filter((issue) => issue.assigned_to_id === null).length

  return {
    title: '현재 상태 스냅샷',
    subtitle: '지금 어떤 신호를 먼저 눌러서 작업 화면으로 들어갈지 바로 고를 수 있는 요약입니다.',
    items: [
      {
        id: 'overdue',
        label: '기한 초과',
        count: overdueCount,
        note: overdueCount > 0 ? '즉시 재정렬이 필요한 지연 작업' : '현재 지연 작업 없음',
        tone: overdueCount > 0 ? 'danger' : 'success',
        preset: 'overdue',
      },
      {
        id: 'due_soon',
        label: '임박 일정',
        count: dueSoonCount,
        note: `${settings.dueSoonDays}일 이내 마감 기준`,
        tone: dueSoonCount > 0 ? 'warning' : 'neutral',
        preset: 'due_soon',
      },
      {
        id: 'stale',
        label: '정체 이슈',
        count: staleCount,
        note: `${settings.staleDays}일 이상 갱신 없음`,
        tone: staleCount > 0 ? 'warning' : 'success',
        preset: 'stale',
      },
      {
        id: 'unassigned',
        label: '미할당',
        count: unassignedCount,
        note: '실행 책임이 비어 있는 작업',
        tone: unassignedCount > 0 ? 'warning' : 'neutral',
        preset: 'unassigned',
      },
    ],
  }
}

function buildStableState(issues: IssueListItem[], settings: DashboardThresholdSettings): StableOperationalState {
  const activeIssues = issues.filter(isActiveIssue)
  const recentlyUpdatedCount = activeIssues.filter((issue) => evaluateIssueRisk(issue, settings).isRecentlyUpdated).length
  const overdueResolved = issues
    .filter((issue) => issue.status_group === 'closed' && issue.due_date && issue.updated_on)
    .map((issue) => {
      const dueDate = parseLocalDate(issue.due_date)
      const updatedOn = parseLocalDate(issue.updated_on)
      if (!dueDate || !updatedOn || updatedOn <= dueDate) return null
      return { issue, daysAgo: diffDays(updatedOn, new Date()) }
    })
    .filter((value): value is { issue: IssueListItem; daysAgo: number } => value !== null)
    .sort((left, right) => left.daysAgo - right.daysAgo)[0]

  const workload = new Map<string, { name: string; openCount: number; watchCount: number }>()
  activeIssues.forEach((issue) => {
    const key = String(issue.assigned_to_id ?? 'unassigned')
    const current = workload.get(key) ?? {
      name: issue.assigned_to ?? '미할당',
      openCount: 0,
      watchCount: 0,
    }
    const risk = evaluateIssueRisk(issue, settings)
    current.openCount += 1
    if (risk.isDueSoon || risk.daysSinceUpdate === settings.staleDays - 1) {
      current.watchCount += 1
    }
    workload.set(key, current)
  })

  const workloadValues = Array.from(workload.values())
  const topLoad = workloadValues.sort((left, right) => right.openCount - left.openCount)[0]
  const nextBottleneck = Array.from(workload.values()).sort((left, right) => right.watchCount - left.watchCount)[0]

  return {
    title: '현재 운영 안정',
    description: '긴급 조치 큐는 비어 있습니다. 대신 현재 진행 흐름과 다음 병목 후보를 짧게 확인하세요.',
    items: [
      {
        id: 'last-overdue',
        label: '최근 지연 종료',
        value: overdueResolved ? formatDaysAgo(overdueResolved.daysAgo) : '기록 없음',
        note: overdueResolved ? `최근 지연 종료 이슈 #${overdueResolved.issue.id}` : '최근 종료 이슈 중 지연 완료 흔적이 없습니다.',
      },
      {
        id: 'recently-updated',
        label: '기준 내 업데이트',
        value: `${recentlyUpdatedCount}/${activeIssues.length}`,
        note: `${settings.recentActivityDays}일 이내 갱신된 활성 이슈 비율`,
      },
      {
        id: 'top-load',
        label: '현재 가장 바쁜 담당자',
        value: topLoad ? `${topLoad.name} · ${topLoad.openCount}건` : '없음',
        note: '현재 진행 중 작업량 기준',
      },
      {
        id: 'next-bottleneck',
        label: '다음 병목 후보',
        value: nextBottleneck && nextBottleneck.watchCount > 0 ? `${nextBottleneck.name} · ${nextBottleneck.watchCount}건` : '뚜렷한 후보 없음',
        note: '임박 일정 또는 정체 임계값 근접 기준',
      },
    ],
  }
}

function buildCapacity(issues: IssueListItem[], settings: DashboardThresholdSettings): CapacityMemberModel[] {
  const members = new Map<string, CapacityMemberModel>()

  issues.forEach((issue) => {
    if (!isActiveIssue(issue) && issue.status_group !== 'closed') return

    const key = String(issue.assigned_to_id ?? 'unassigned')
    const risk = evaluateIssueRisk(issue, settings)
    const existing = members.get(key) ?? {
      key,
      assignee: {
        id: issue.assigned_to_id,
        name: issue.assigned_to ?? '미할당',
      },
      openCount: 0,
      inProgressCount: 0,
      highPriorityCount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      staleCount: 0,
      closedRecentlyCount: 0,
      recentUpdateRate: 0,
      utilizationRate: 0,
      riskScore: 0,
      band: 'balanced' as const,
    }

    if (risk.isActive) {
      existing.openCount += 1
      existing.inProgressCount += issue.status_group === 'in_progress' ? 1 : 0
      existing.highPriorityCount += isHighPriorityIssue(issue) ? 1 : 0
      existing.overdueCount += risk.isOverdue ? 1 : 0
      existing.dueSoonCount += risk.isDueSoon ? 1 : 0
      existing.staleCount += risk.isStale ? 1 : 0
      existing.recentUpdateRate += risk.isRecentlyUpdated ? 1 : 0
    }

    if (risk.isRecentlyCompleted) {
      existing.closedRecentlyCount += 1
    }

    members.set(key, existing)
  })

  return Array.from(members.values())
    .map((member) => {
      const riskScore =
        member.overdueCount * 5 +
        member.staleCount * 3 +
        member.dueSoonCount * 2 +
        Math.max(0, member.openCount - settings.overloadThreshold) * 2
      const utilizationRate = settings.overloadThreshold > 0 ? member.openCount / settings.overloadThreshold : 0
      const recentUpdateRate = member.openCount > 0 ? member.recentUpdateRate / member.openCount : 0
      const band: CapacityMemberModel['band'] = utilizationRate >= 1.2 || riskScore >= 10
        ? 'stretched'
        : utilizationRate >= 0.8 || riskScore >= 5
          ? 'watch'
          : 'balanced'

      return {
        ...member,
        recentUpdateRate,
        utilizationRate,
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

function buildExplorerPresets(issues: IssueListItem[], settings: DashboardThresholdSettings): ExplorerPresetModel[] {
  const countByPreset = (preset: ExplorerPresetModel['id']) => issues.filter((issue) => matchesIssuePreset(issue, preset, settings)).length

  return [
    { id: null, label: '전체 이슈', count: issues.length },
    { id: 'attention', label: '조치 필요', count: countByPreset('attention') },
    { id: 'overdue', label: '기한 초과', count: countByPreset('overdue') },
    { id: 'due_soon', label: '임박 일정', count: countByPreset('due_soon') },
    { id: 'stale', label: '정체', count: countByPreset('stale') },
    { id: 'high_priority', label: '높은 우선순위', count: countByPreset('high_priority') },
    { id: 'unassigned', label: '미할당', count: countByPreset('unassigned') },
    { id: 'closed_recently', label: `최근 완료 ${settings.recentCompletionDays}일`, count: countByPreset('closed_recently') },
  ]
}

export function buildDashboardModel(
  summary: DashboardSummary,
  issues: IssueListItem[],
  settings: DashboardThresholdSettings,
): DashboardModel {
  return {
    summary: buildSummaryCards(summary, issues, settings),
    statusSnapshot: buildStatusSnapshot(issues, settings),
    actions: buildActions(issues, settings),
    stableState: buildStableState(issues, settings),
    capacity: buildCapacity(issues, settings),
    health: buildHealthModel(summary, issues, settings),
    insights: buildAssigneeInsights(issues, settings),
    explorerPresets: buildExplorerPresets(issues, settings),
  }
}