'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Badge from '@/components/Badge'
import FilterChips from '@/components/FilterChips'
import SectionCard from '@/components/SectionCard'
import { getIssueSignals, type ExplorerPresetModel } from '@/lib/dashboard'
import {
  PRIORITY_ORDER,
  STATUS_GROUP_LABEL,
  getPriorityLabel,
} from '@/lib/labels'
import type { DashboardFilter, IssueListItem, IssuePreset } from '@/types/dashboard'

type SortKey = 'id' | 'subject' | 'assignee' | 'priority' | 'due' | 'updated' | 'progress'
type SortDir = 'asc' | 'desc'

interface Props {
  issues: IssueListItem[]
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

function formatDue(issue: IssueListItem) {
  if (issue.is_overdue) {
    return { label: `지연 ${issue.days_overdue}일`, tone: 'danger' as const }
  }
  if (issue.days_until_due === 0) {
    return { label: '오늘 마감', tone: 'warning' as const }
  }
  if (issue.days_until_due !== null && issue.days_until_due > 0) {
    return { label: `${issue.days_until_due}일 남음`, tone: issue.days_until_due <= 3 ? 'warning' as const : 'neutral' as const }
  }
  return { label: issue.due_date ?? '마감일 없음', tone: 'neutral' as const }
}

function formatUpdated(daysSinceUpdate: number | null, updatedOn: string | null) {
  if (daysSinceUpdate === null) return updatedOn ?? '업데이트 없음'
  if (daysSinceUpdate === 0) return '오늘'
  if (daysSinceUpdate === 1) return '1일 전'
  return `${daysSinceUpdate}일 전`
}

export default function IssueExplorer({
  issues,
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
  const [sortKey, setSortKey] = useState<SortKey>('updated')
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
          comparison = (left.days_until_due ?? 999) - (right.days_until_due ?? 999)
          if (left.is_overdue || right.is_overdue) {
            comparison = (right.days_overdue ?? 0) - (left.days_overdue ?? 0)
          }
          break
        case 'updated':
          comparison = (left.days_since_update ?? 999) - (right.days_since_update ?? 999)
          break
        case 'progress':
          comparison = left.done_ratio - right.done_ratio
          break
      }

      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [searchedIssues, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / PAGE_SIZE))
  const pageItems = sortedIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
      title="이슈 탐색기"
      subtitle="필터 기반으로 점검, 후속 조치, 내부 상세 확인까지 이어지는 작업 화면입니다."
      aside={<Badge tone="neutral">{issues.length}건 표시</Badge>}
      bodyClassName="space-y-4"
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = preset.id === filter.preset || (preset.id === null && filter.preset === null)
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
              ].join(' ')}
            >
              {preset.label} <span className="ml-1 text-[11px] opacity-80">{preset.count}</span>
            </button>
          )
        })}
      </div>

      <FilterChips filter={filter} onClear={onClearFilter} onClearAll={onClearAll} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
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
            className="w-80 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="text-xs text-slate-500">
          {searchedIssues.length}건
          {search.trim() ? ` · "${search.trim()}" 검색 결과` : ''}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">이슈를 불러오는 중...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[1080px] w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('subject')}>이슈</th>
                  <th className="px-4 py-3 text-left">위험</th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('priority')}>상태</th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('assignee')}>담당자</th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('due')}>마감</th>
                  <th className="px-4 py-3 text-left cursor-pointer" onClick={() => toggleSort('updated')}>업데이트</th>
                  <th className="px-4 py-3 text-right cursor-pointer" onClick={() => toggleSort('progress')}>진행률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                      {search.trim() ? '현재 검색 조건과 일치하는 이슈가 없습니다.' : '현재 필터와 일치하는 이슈가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((issue) => {
                    const signals = getIssueSignals(issue)
                    const due = formatDue(issue)

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
                            {issue.priority ? ` • ${getPriorityLabel(issue.priority)}` : ''}
                            {issue.author ? ` • ${issue.author}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex max-w-[220px] flex-wrap gap-1.5">
                            {signals.length > 0 ? signals.map((signal) => (
                              <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>{signal.label}</Badge>
                            )) : <span className="text-xs text-slate-300">위험 신호 없음</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone={getStatusTone(issue.status_group)}>{issue.status}</Badge>
                            {issue.priority ? (
                              <Badge tone={getPriorityTone(issue.priority)}>{getPriorityLabel(issue.priority)}</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{STATUS_GROUP_LABEL[issue.status_group] ?? issue.status_group}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{issue.assigned_to ?? '미할당'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={due.tone}>{due.label}</Badge>
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