'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Badge from '@/components/Badge'
import FilterChips from '@/components/FilterChips'
import SectionCard from '@/components/SectionCard'
import { evaluateIssueRisk, getIssueSignals, type DashboardThresholdSettings, type ExplorerPresetModel } from '@/lib/dashboard'
import {
  PRIORITY_ORDER,
  STATUS_GROUP_LABEL,
  getPriorityLabel,
} from '@/lib/labels'
import type { DashboardFilter, IssueListItem, IssuePreset } from '@/types/dashboard'

type SortKey = 'attention' | 'id' | 'subject' | 'assignee' | 'priority' | 'due' | 'updated' | 'progress'
type SortDir = 'asc' | 'desc'

interface Props {
  issues: IssueListItem[]
  settings: DashboardThresholdSettings
  loading?: boolean
  selectedIssueId: number | null
  filter: DashboardFilter
  presets: ExplorerPresetModel[]
  onSelectIssue: (issueId: number) => void
  onSelectPreset: (preset: IssuePreset | null) => void
  onClearFilter: (key: keyof DashboardFilter) => void
  onClearAll: () => void
}

const PAGE_SIZE = 20

function getStatusTone(statusGroup: string) {
  if (statusGroup === 'closed') return 'success'
  if (statusGroup === 'in_progress') return 'info'
  if (statusGroup === 'open') return 'warning'
  return 'neutral'
}

function getPriorityTone(priority: string | null) {
  if (priority === 'Immediate' || priority === 'Urgent') return 'danger'
  if (priority === 'High') return 'warning'
  if (priority === 'Normal') return 'neutral'
  return 'neutral'
}

function formatDue(issue: IssueListItem, settings: DashboardThresholdSettings) {
  const risk = evaluateIssueRisk(issue, settings)

  if (risk.isOverdue) {
    return { label: `지연 ${risk.daysOverdue}일`, tone: 'danger' as const }
  }
  if (risk.daysUntilDue === 0) {
    return { label: '오늘 마감', tone: 'warning' as const }
  }
  if (risk.daysUntilDue !== null && risk.daysUntilDue > 0) {
    return {
      label: `${risk.daysUntilDue}일 남음`,
      tone: risk.daysUntilDue <= settings.dueSoonDays ? 'warning' as const : 'neutral' as const,
    }
  }
  return { label: issue.due_date ?? '마감일 없음', tone: 'neutral' as const }
}

function formatUpdated(daysSinceUpdate: number | null, updatedOn: string | null) {
  if (daysSinceUpdate === null) return updatedOn ?? '업데이트 없음'
  if (daysSinceUpdate === 0) return '오늘'
  if (daysSinceUpdate === 1) return '1일 전'
  return `${daysSinceUpdate}일 전`
}

function getAttentionScore(issue: IssueListItem, settings: DashboardThresholdSettings) {
  const risk = evaluateIssueRisk(issue, settings)

  return (
    (risk.isLongOverdue ? 120 : 0) +
    risk.daysOverdue * 8 +
    (risk.isOverdue ? 40 : 0) +
    (risk.isStale ? 28 : 0) +
    (risk.daysSinceUpdate ?? 0) +
    (risk.isDueSoon ? 18 : 0) +
    (issue.assigned_to_id === null && risk.isActive ? 20 : 0) +
    (issue.priority === 'Immediate' || issue.priority === 'Urgent' ? 16 : 0) +
    (issue.priority === 'High' ? 10 : 0)
  )
}

function getPrimaryReason(issue: IssueListItem, settings: DashboardThresholdSettings) {
  const risk = evaluateIssueRisk(issue, settings)

  if (risk.isOverdue) {
    return {
      label: `마감 지연 ${risk.daysOverdue}일`,
      detail: '일정 재조정 또는 담당 확인이 먼저 필요한 상태입니다.',
      tone: risk.isLongOverdue ? 'danger' as const : 'warning' as const,
    }
  }

  if (risk.isStale && risk.daysSinceUpdate !== null) {
    return {
      label: `업데이트 정체 ${risk.daysSinceUpdate}일`,
      detail: '진행 여부와 막힌 지점을 다시 확인해야 합니다.',
      tone: 'warning' as const,
    }
  }

  if (risk.isDueSoon && risk.daysUntilDue !== null) {
    return {
      label: risk.daysUntilDue === 0 ? '오늘 마감' : `${risk.daysUntilDue}일 내 마감`,
      detail: '이번 주 안에 다시 봐야 지연으로 넘어가지 않습니다.',
      tone: 'warning' as const,
    }
  }

  if (risk.isActive && issue.assigned_to_id === null) {
    return {
      label: '담당 미지정',
      detail: '소유권이 정해져야 실제 진행이 시작됩니다.',
      tone: 'neutral' as const,
    }
  }

  if (issue.priority === 'Immediate' || issue.priority === 'Urgent' || issue.priority === 'High') {
    return {
      label: '높은 우선순위',
      detail: '다른 신호와 겹치면 먼저 처리해야 하는 작업입니다.',
      tone: 'danger' as const,
    }
  }

  if (issue.status_group === 'closed') {
    return {
      label: '최근 완료 흐름',
      detail: '최근 마감 처리 흐름 확인용 이슈입니다.',
      tone: 'success' as const,
    }
  }

  return {
    label: '일반 점검 대상',
    detail: '대표 위험 신호는 크지 않지만 목록에서 함께 확인할 작업입니다.',
    tone: 'info' as const,
  }
}

function SortLabel({
  label,
  active,
  dir,
}: {
  label: string
  active: boolean
  dir: SortDir
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      {active ? <span className="text-slate-700">{dir === 'asc' ? '↑' : '↓'}</span> : null}
    </span>
  )
}

export default function IssueExplorer({
  issues,
  settings,
  loading,
  selectedIssueId,
  filter,
  presets,
  onSelectIssue,
  onSelectPreset,
  onClearFilter,
  onClearAll,
}: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('attention')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const prevIssuesRef = useRef(issues)

  useEffect(() => {
    if (prevIssuesRef.current !== issues) {
      prevIssuesRef.current = issues
      setPage(1)
    }
  }, [issues])

  const searchedIssues = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return issues

    return issues.filter((issue) => {
      return (
        issue.subject.toLowerCase().includes(query) ||
        String(issue.id).includes(query) ||
        (issue.assigned_to?.toLowerCase().includes(query) ?? false) ||
        (issue.tracker?.toLowerCase().includes(query) ?? false) ||
        (issue.author?.toLowerCase().includes(query) ?? false)
      )
    })
  }, [issues, search])

  const sortedIssues = useMemo(() => {
    return [...searchedIssues].sort((left, right) => {
      let comparison = 0

      switch (sortKey) {
        case 'attention':
          comparison = getAttentionScore(left, settings) - getAttentionScore(right, settings)
          break
        case 'id':
          comparison = left.id - right.id
          break
        case 'subject':
          comparison = left.subject.localeCompare(right.subject)
          break
        case 'assignee':
          comparison = (left.assigned_to ?? 'zzzz').localeCompare(right.assigned_to ?? 'zzzz')
          break
        case 'priority':
          comparison = (PRIORITY_ORDER[left.priority ?? ''] ?? 0) - (PRIORITY_ORDER[right.priority ?? ''] ?? 0)
          break
        case 'due':
          comparison = (evaluateIssueRisk(left, settings).daysUntilDue ?? 999) - (evaluateIssueRisk(right, settings).daysUntilDue ?? 999)
          if (evaluateIssueRisk(left, settings).isOverdue || evaluateIssueRisk(right, settings).isOverdue) {
            comparison = evaluateIssueRisk(right, settings).daysOverdue - evaluateIssueRisk(left, settings).daysOverdue
          }
          break
        case 'updated':
          comparison = (evaluateIssueRisk(left, settings).daysSinceUpdate ?? 999) - (evaluateIssueRisk(right, settings).daysSinceUpdate ?? 999)
          break
        case 'progress':
          comparison = left.done_ratio - right.done_ratio
          break
      }

      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [searchedIssues, settings, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / PAGE_SIZE))
  const pageItems = sortedIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasActiveFilter = Boolean(filter.statusGroup || filter.assignee || filter.preset)
  const activePreset = presets.find((preset) => preset.id === filter.preset) ?? null
  const activeSortLabel = {
    attention: '우선 사유',
    id: '번호',
    subject: '이슈명',
    assignee: '담당자',
    priority: '우선순위',
    due: '마감일',
    updated: '최근 업데이트',
    progress: '진행률',
  }[sortKey]

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(nextKey)
      setSortDir(nextKey === 'subject' || nextKey === 'assignee' ? 'asc' : 'desc')
    }
  }

  return (
    <SectionCard
      title="작업 화면"
      subtitle="무엇을 먼저 봐야 하는지 바로 정하고, 목록에서는 한 번에 판단할 수 있게 밀도를 낮췄습니다."
      aside={<Badge tone="info" size="md">작업 영역 · {issues.length}건</Badge>}
      density="primary"
      bodyClassName="space-y-5"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-2">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isActive = preset.id === filter.preset || (preset.id === null && filter.preset === null)
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={[
                    'rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-white bg-white text-slate-950 shadow-sm shadow-slate-200/70'
                      : 'border-transparent bg-transparent text-slate-500 hover:border-white hover:bg-white hover:text-slate-900',
                  ].join(' ')}
                >
                  {preset.label} <span className="ml-1 text-[11px] text-slate-400">{preset.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">현재 보기</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{activePreset?.label ?? '전체 작업'}</div>
            <div className="mt-1 text-sm text-slate-500">{searchedIssues.length}건 기준</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">정렬 기준</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{activeSortLabel}</div>
            <div className="mt-1 text-sm text-slate-500">{sortDir === 'desc' ? '위험도 높은 순' : '오름차순'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">필터 상태</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{hasActiveFilter ? '적용 중' : '없음'}</div>
            <div className="mt-1 text-sm text-slate-500">{hasActiveFilter ? '상단 칩에서 바로 해제 가능' : '전체 흐름을 보고 있습니다.'}</div>
          </div>
        </div>
      </div>

      <FilterChips filter={filter} onClear={onClearFilter} onClearAll={onClearAll} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-auto">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="이슈명, 담당자, 트래커, 작성자, 번호로 검색"
            className="w-full max-w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 sm:w-80"
          />
        </div>
        <div className="text-xs text-slate-400">
          {searchedIssues.length}건
          {search.trim() ? ` · "${search.trim()}" 검색 결과` : ''}
          {!search.trim() && hasActiveFilter ? ' · 필터 적용 중' : ''}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">이슈를 불러오는 중...</div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {pageItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                {search.trim()
                  ? '현재 검색어와 맞는 작업이 없습니다. 검색 범위를 조금 넓히거나 이슈 번호로 찾아보세요.'
                  : '현재 필터와 맞는 작업이 없습니다. 상단 큐를 한 단계 풀면 전체 흐름을 다시 볼 수 있습니다.'}
              </div>
            ) : (
              pageItems.map((issue) => {
                const signals = getIssueSignals(issue, settings)
                const due = formatDue(issue, settings)
                const primaryReason = getPrimaryReason(issue, settings)

                return (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => onSelectIssue(issue.id)}
                    className={[
                      'rounded-[24px] border px-4 py-4 text-left transition-colors',
                      selectedIssueId === issue.id
                        ? 'border-slate-300 bg-slate-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-400">#{issue.id}</div>
                        <div className="mt-1 text-sm font-semibold leading-6 text-slate-950">{issue.subject}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {issue.tracker ?? '이슈'}
                          {issue.author ? ` · ${issue.author}` : ''}
                        </div>
                      </div>
                      <Badge tone={primaryReason.tone} size="md">{primaryReason.label}</Badge>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">{primaryReason.detail}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone={getStatusTone(issue.status_group)} size="md">{issue.status}</Badge>
                      {issue.priority ? <Badge tone={getPriorityTone(issue.priority)}>{getPriorityLabel(issue.priority)}</Badge> : null}
                      <Badge tone={due.tone}>{due.label}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">담당자</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{issue.assigned_to ?? '미할당'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">최근 업데이트</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{formatUpdated(issue.days_since_update, issue.updated_on)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">진행률</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{issue.done_ratio}%</div>
                      </div>
                    </div>

                    {signals.length > 1 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {signals
                          .filter((signal) => signal.label !== primaryReason.label)
                          .slice(0, 3)
                          .map((signal) => (
                            <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>{signal.label}</Badge>
                          ))}
                      </div>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-[24px] border border-slate-200 shadow-sm shadow-slate-200/10 lg:block">
            <table className="min-w-[960px] w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('subject')}>
                    <SortLabel label="이슈" active={sortKey === 'subject'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('attention')}>
                    <SortLabel label="우선 사유" active={sortKey === 'attention'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('priority')}>
                    <SortLabel label="상태/우선순위" active={sortKey === 'priority'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('assignee')}>
                    <SortLabel label="담당자" active={sortKey === 'assignee'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('due')}>
                    <SortLabel label="마감" active={sortKey === 'due'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('updated')}>
                    <SortLabel label="업데이트" active={sortKey === 'updated'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer" onClick={() => toggleSort('progress')}>
                    <SortLabel label="진행률" active={sortKey === 'progress'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                      {search.trim()
                        ? '현재 검색어와 맞는 작업이 없습니다. 검색 범위를 조금 넓히거나 담당자 이름 대신 이슈 번호로 찾아보세요.'
                        : '현재 필터와 맞는 작업이 없습니다. 상단 우선 큐나 필터를 한 단계 풀면 다시 전체 흐름을 볼 수 있습니다.'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((issue) => {
                    const signals = getIssueSignals(issue, settings)
                    const visibleSignals = signals.slice(0, 2)
                    const hiddenSignalCount = Math.max(0, signals.length - visibleSignals.length)
                    const due = formatDue(issue, settings)
                    const primaryReason = getPrimaryReason(issue, settings)

                    return (
                      <tr
                        key={issue.id}
                        onClick={() => onSelectIssue(issue.id)}
                        className={[
                          'cursor-pointer align-top transition-colors hover:bg-slate-50',
                          selectedIssueId === issue.id ? 'bg-slate-50' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <div className="text-[11px] font-semibold text-slate-400">#{issue.id}</div>
                          <div className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">{issue.subject}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {issue.tracker ?? '이슈'}
                            {issue.author ? ` • ${issue.author}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={primaryReason.tone} size="md">{primaryReason.label}</Badge>
                          <div className="mt-2 max-w-[240px] text-xs leading-5 text-slate-500">{primaryReason.detail}</div>
                          <div className="mt-2 flex max-w-[240px] flex-wrap gap-1.5">
                            {visibleSignals
                              .filter((signal) => signal.label !== primaryReason.label)
                              .map((signal) => (
                                <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>{signal.label}</Badge>
                              ))}
                            {hiddenSignalCount > 0 ? <span className="text-xs text-slate-400">+{hiddenSignalCount}</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={getStatusTone(issue.status_group)} size="md">{issue.status}</Badge>
                            {issue.priority ? (
                              <Badge tone={getPriorityTone(issue.priority)}>{getPriorityLabel(issue.priority)}</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{STATUS_GROUP_LABEL[issue.status_group] ?? issue.status_group}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{issue.assigned_to ?? '미할당'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={due.tone} size="md">{due.label}</Badge>
                          {issue.due_date ? <div className="mt-1 text-xs text-slate-500">{issue.due_date}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-700">{formatUpdated(issue.days_since_update, issue.updated_on)}</div>
                          <div className="mt-1 text-xs text-slate-500">{issue.updated_on ?? '날짜 없음'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-slate-800">{issue.done_ratio}%</div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${issue.done_ratio}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, sortedIssues.length)} / {sortedIssues.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-30"
                >
                  이전
                </button>
                <span className="px-2 text-xs text-slate-500">페이지 {page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  )
}