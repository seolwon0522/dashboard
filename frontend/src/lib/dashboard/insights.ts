import type { IssueDetail, IssueListItem } from '@/types/dashboard'
import type {
  AssigneeEvidenceMetric,
  AssigneeJournalInsight,
  AssigneeTendencyInsight,
  AssigneeTendencyTag,
  DashboardThresholdSettings,
  DashboardTone,
} from '@/types/dashboard-derived'
import { diffDays, parseLocalDate, round } from '@/lib/dashboard/date'
import { evaluateIssueRisk, isActiveIssue } from '@/lib/dashboard/thresholds'

function formatPercent(value: number | null): string {
  if (value === null) return '데이터 부족'
  return `${Math.round(value * 100)}%`
}

function buildTrend(closedIssues: IssueListItem[]): number[] {
  const today = new Date()
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(today)
    start.setDate(today.getDate() - (5 - index) * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return closedIssues.filter((issue) => {
      const updatedOn = parseLocalDate(issue.updated_on)
      return updatedOn !== null && updatedOn >= start && updatedOn <= end
    }).length
  })

  return weeks
}

function buildInterpretation(tags: string[], activeCount: number, staleShare: number, onTimeRate: number | null): string {
  if (tags.includes('마감 안정') && tags.includes('병렬 작업량 높음')) {
    return '동시에 맡은 작업이 많아도 마감 흐름은 비교적 안정적으로 유지되고 있습니다.'
  }

  if (tags.includes('장기 보유 비중 높음')) {
    return '장기 보유 중인 작업 비중이 높아 정체 이슈와 진행 갱신 간격을 함께 확인하는 편이 좋습니다.'
  }

  if (tags.includes('처리 속도 빠름')) {
    return '리드타임이 짧은 편이라 단기 처리 과제가 빠르게 마무리되는 흐름이 보입니다.'
  }

  if (activeCount === 0 && onTimeRate !== null) {
    return '현재 활성 작업은 많지 않으며, 최근 완료 흐름은 비교적 안정적입니다.'
  }

  if (staleShare >= 0.4) {
    return '활성 이슈 중 정체 비중이 높아 중간 점검 간격을 짧게 두는 편이 좋습니다.'
  }

  return '현재 작업 흐름은 평균 범위이며, 임박 일정과 정체 이슈 비율을 함께 보는 것이 좋습니다.'
}

function toTag(label: string, tone: DashboardTone): AssigneeTendencyTag {
  return { label, tone }
}

function toEvidence(label: string, value: string): AssigneeEvidenceMetric {
  return { label, value }
}

export function buildAssigneeInsights(
  issues: IssueListItem[],
  settings: DashboardThresholdSettings,
): AssigneeTendencyInsight[] {
  const grouped = new Map<number, IssueListItem[]>()
  const named = new Map<number, string>()

  issues.forEach((issue) => {
    if (issue.assigned_to_id === null || !issue.assigned_to) return
    const list = grouped.get(issue.assigned_to_id) ?? []
    list.push(issue)
    grouped.set(issue.assigned_to_id, list)
    named.set(issue.assigned_to_id, issue.assigned_to)
  })

  return Array.from(grouped.entries())
    .map(([assigneeId, assigneeIssues]) => {
      const activeIssues = assigneeIssues.filter(isActiveIssue)
      const closedIssues = assigneeIssues.filter((issue) => issue.status_group === 'closed')
      const recentClosed = closedIssues.filter((issue) => evaluateIssueRisk(issue, settings).isRecentlyCompleted)
      const activeRisks = activeIssues.map((issue) => evaluateIssueRisk(issue, settings))
      const staleShare = activeIssues.length > 0
        ? activeRisks.filter((risk) => risk.isStale).length / activeIssues.length
        : 0
      const recentUpdateRate = activeIssues.length > 0
        ? activeRisks.filter((risk) => risk.isRecentlyUpdated).length / activeIssues.length
        : 0

      const leadTimes = closedIssues
        .map((issue) => {
          const createdOn = parseLocalDate(issue.created_on)
          const updatedOn = parseLocalDate(issue.updated_on)
          if (!createdOn || !updatedOn) return null
          return diffDays(createdOn, updatedOn)
        })
        .filter((value): value is number => value !== null)
      const averageLeadTimeDays = leadTimes.length > 0
        ? round(leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length)
        : null

      const onTimeCandidates = closedIssues.filter((issue) => issue.due_date && issue.updated_on)
      const onTimeRate = onTimeCandidates.length > 0
        ? onTimeCandidates.filter((issue) => {
          const dueDate = parseLocalDate(issue.due_date)
          const updatedOn = parseLocalDate(issue.updated_on)
          return !!dueDate && !!updatedOn && updatedOn <= dueDate
        }).length / onTimeCandidates.length
        : null

      const longHoldRatio = assigneeIssues.length > 0
        ? assigneeIssues.filter((issue) => {
          const risk = evaluateIssueRisk(issue, settings)
          if (risk.isActive) {
            return (risk.daysSinceCreated ?? 0) >= settings.staleDays * 2
          }

          const createdOn = parseLocalDate(issue.created_on)
          const updatedOn = parseLocalDate(issue.updated_on)
          return !!createdOn && !!updatedOn && diffDays(createdOn, updatedOn) >= settings.staleDays * 2
        }).length / assigneeIssues.length
        : 0

      const tags: AssigneeTendencyTag[] = []

      if (activeIssues.length >= settings.overloadThreshold && staleShare < 0.35) {
        tags.push(toTag('병렬 작업량 높음', 'info'))
      }

      if (onTimeRate !== null && onTimeRate >= 0.85 && activeRisks.filter((risk) => risk.isOverdue).length === 0) {
        tags.push(toTag('마감 안정', 'success'))
      }

      if (averageLeadTimeDays !== null && averageLeadTimeDays <= settings.recentCompletionDays * 1.5 && recentClosed.length >= 2) {
        tags.push(toTag('처리 속도 빠름', 'success'))
      }

      if (longHoldRatio >= 0.35 || staleShare >= 0.35) {
        tags.push(toTag('장기 보유 비중 높음', 'warning'))
      }

      if (tags.length === 0 && recentUpdateRate >= 0.8 && activeIssues.length > 0) {
        tags.push(toTag('갱신 유지 안정', 'success'))
      }

      if (tags.length === 0) {
        tags.push(toTag('추가 관찰', 'neutral'))
      }

      const interpretation = buildInterpretation(tags.map((tag) => tag.label), activeIssues.length, staleShare, onTimeRate)

      return {
        key: String(assigneeId),
        assignee: {
          id: assigneeId,
          name: named.get(assigneeId) ?? `담당자 ${assigneeId}`,
        },
        activeCount: activeIssues.length,
        tendencyTags: tags.slice(0, 3),
        evidence: [
          toEvidence('평균 리드타임', averageLeadTimeDays === null ? '데이터 부족' : `${averageLeadTimeDays}일`),
          toEvidence('마감 준수율', formatPercent(onTimeRate)),
          toEvidence('최근 갱신 유지율', `${Math.round(recentUpdateRate * 100)}%`),
        ],
        interpretation,
        sparkline: buildTrend(closedIssues),
        averageLeadTimeDays,
        onTimeRate,
        recentUpdateRate,
        staleShare,
        sampleIssueIds: assigneeIssues
          .filter((issue) => issue.updated_on)
          .sort((left, right) => (right.updated_on ?? '').localeCompare(left.updated_on ?? ''))
          .slice(0, 6)
          .map((issue) => issue.id),
      }
    })
    .sort((left, right) => {
      if (right.activeCount !== left.activeCount) {
        return right.activeCount - left.activeCount
      }

      return right.sparkline.reduce((sum, value) => sum + value, 0) - left.sparkline.reduce((sum, value) => sum + value, 0)
    })
}

export function summarizeAssigneeJournalActivity(
  details: IssueDetail[],
  settings: DashboardThresholdSettings,
): AssigneeJournalInsight {
  const nonEmptyDetails = details.filter((detail) => detail.journals.length > 0)
  const sampleSize = details.length
  const notesCount = details.reduce((sum, detail) => {
    return sum + detail.journals.filter((journal) => journal.notes && journal.notes.trim().length > 0).length
  }, 0)
  const changeEvents = details.reduce((sum, detail) => {
    return sum + detail.journals.reduce((detailSum, journal) => {
      return detailSum + journal.changes.filter((change) => ['status_id', 'done_ratio', 'assigned_to_id', 'priority_id'].includes(change.field)).length
    }, 0)
  }, 0)

  const intervals = nonEmptyDetails.flatMap((detail) => {
    const sorted = [...detail.journals]
      .map((journal) => parseLocalDate(journal.created_on))
      .filter((value): value is Date => value !== null)
      .sort((left, right) => left.getTime() - right.getTime())

    return sorted.slice(1).map((date, index) => diffDays(sorted[index], date))
  })

  const averageJournalGapDays = intervals.length > 0
    ? round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length)
    : null

  const lateStageCandidates = details
    .map((detail) => {
      const createdOn = parseLocalDate(detail.created_on)
      const updatedOn = parseLocalDate(detail.updated_on)
      if (!createdOn || !updatedOn || detail.journals.length === 0) return null

      const lifecycle = Math.max(1, diffDays(createdOn, updatedOn))
      const statusChanges = detail.journals
        .filter((journal) => journal.changes.some((change) => ['status_id', 'done_ratio'].includes(change.field)))
        .map((journal) => parseLocalDate(journal.created_on))
        .filter((value): value is Date => value !== null)

      if (statusChanges.length === 0) return null
      const lastChange = statusChanges[statusChanges.length - 1]
      return diffDays(createdOn, lastChange) / lifecycle
    })
    .filter((value): value is number => value !== null)

  const lateStageChangeRatio = lateStageCandidates.length > 0
    ? lateStageCandidates.filter((value) => value >= 0.7).length / lateStageCandidates.length
    : null

  const observations: string[] = []
  if (averageJournalGapDays !== null) {
    observations.push(`이력 반영 간격 평균 ${averageJournalGapDays}일`)
  }
  if (notesCount > 0) {
    observations.push(`이슈당 메모 ${round(notesCount / Math.max(sampleSize, 1))}회`)
  }
  if (changeEvents > 0) {
    observations.push(`이슈당 상태/진행 갱신 ${round(changeEvents / Math.max(sampleSize, 1))}회`)
  }
  if (lateStageChangeRatio !== null && lateStageChangeRatio >= 0.6) {
    observations.push(`표본 기준 후반 갱신 비중 ${Math.round(lateStageChangeRatio * 100)}%`)
  }

  let interpretation = '표본 이력 수가 적어 운영 패턴은 참고용으로만 보는 편이 좋습니다.'
  if (lateStageChangeRatio !== null && lateStageChangeRatio >= 0.6) {
    interpretation = '상태 갱신이 종료 직전에 몰리는 흐름이 보여 중간 점검 빈도를 높이는 편이 좋습니다.'
  } else if (averageJournalGapDays !== null && averageJournalGapDays <= settings.recentActivityDays) {
    interpretation = '이력 반영 주기가 비교적 짧아 진행 상황이 자주 드러나는 흐름입니다.'
  } else if (notesCount === 0 && changeEvents <= sampleSize) {
    interpretation = '세부 이력 노출이 많지 않아 중간 체크포인트를 별도로 두는 편이 안전합니다.'
  }

  return {
    sampleSize,
    notesPerIssue: round(notesCount / Math.max(sampleSize, 1)),
    changeEventsPerIssue: round(changeEvents / Math.max(sampleSize, 1)),
    averageJournalGapDays,
    lateStageChangeRatio,
    observations,
    interpretation,
    issues: details.map((detail) => ({
      id: detail.id,
      subject: detail.subject,
      status: detail.status,
      done_ratio: detail.done_ratio,
    })),
  }
}