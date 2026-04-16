'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Badge from '@/components/Badge'
import FilterChips from '@/components/FilterChips'
import IssueListTable, { sortIssues } from '@/components/IssueListTable'
import ScopeBadge from '@/components/ScopeBadge'
import SectionCard from '@/components/SectionCard'
import { type DashboardThresholdSettings, type ExplorerPresetModel, getIssueSignals } from '@/lib/dashboard'
import {
  formatDue,
  formatUpdated,
  getPrimaryReason,
  getPriorityTone,
  getStatusTone,
  type IssueSortDir,
  type IssueSortKey,
} from '@/lib/dashboard/presentation'
import { getPriorityLabel } from '@/lib/labels'
import type { DashboardFilter, IssueListItem, IssuePreset } from '@/types/dashboard'

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
  const [sortKey, setSortKey] = useState<IssueSortKey>('attention')
  const [sortDir, setSortDir] = useState<IssueSortDir>('desc')
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

    return issues.filter((issue) => (
      issue.subject.toLowerCase().includes(query) ||
      String(issue.id).includes(query) ||
      (issue.assigned_to?.toLowerCase().includes(query) ?? false) ||
      (issue.tracker?.toLowerCase().includes(query) ?? false) ||
      (issue.author?.toLowerCase().includes(query) ?? false)
    ))
  }, [issues, search])

  const sortedIssues = useMemo(() => sortIssues(searchedIssues, settings, sortKey, sortDir), [searchedIssues, settings, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / PAGE_SIZE))
  const pageItems = sortedIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasActiveFilter = Boolean(filter.statusGroup || filter.assignee || filter.preset)
  const activePreset = presets.find((preset) => preset.id === filter.preset) ?? null
  const activeSortLabel = {
    attention: '우선순위',
    id: '번호',
    subject: '이슈명',
    assignee: '담당자',
    priority: '우선순위',
    due: '마감',
    updated: '업데이트',
    progress: '진행률',
  }[sortKey]

  function toggleSort(nextKey: IssueSortKey) {
    if (sortKey === nextKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(nextKey)
      setSortDir(nextKey === 'subject' || nextKey === 'assignee' ? 'asc' : 'desc')
    }
  }

  return (
    <SectionCard
      title="이슈 큐"
      subtitle="개요에서 본 우선순위를 실제 이슈 목록으로 이어서 확인하고, 지금 볼 대상을 정리합니다."
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <ScopeBadge kind="full" label="실제 이슈 기준" />
          <ScopeBadge kind="advisory" label="목록 우선순위 안내" />
          <Badge tone="info" size="md">총 {issues.length}건</Badge>
        </div>
      }
      density="primary"
      bodyClassName="space-y-5"
    >
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-2">
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
                  {preset.label}
                  <span className="ml-1 text-[11px] text-slate-400">{preset.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">현재 큐</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{activePreset?.label ?? '기본 이슈 큐'}</div>
            <div className="mt-1 text-sm text-slate-500">{searchedIssues.length}건 기준으로 보고 있습니다.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">정렬 기준</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{activeSortLabel}</div>
            <div className="mt-1 text-sm text-slate-500">{sortDir === 'desc' ? '중요한 순서' : '오름차순'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">필터 상태</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{hasActiveFilter ? '적용 중' : '없음'}</div>
            <div className="mt-1 text-sm text-slate-500">{hasActiveFilter ? '아래 필터 칩에서 바로 해제할 수 있습니다.' : '전체 흐름 기준으로 우선 이슈를 보고 있습니다.'}</div>
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
            placeholder="이슈명, 담당자, 등록자, 번호로 검색"
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
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">이슈를 불러오는 중입니다.</div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {pageItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                {search.trim()
                  ? '검색 조건에 맞는 이슈가 없습니다. 검색 범위를 줄이거나 번호로 다시 찾아보세요.'
                  : '현재 필터에 맞는 이슈가 없습니다. 필터를 조정하면 전체 흐름으로 다시 확인할 수 있습니다.'}
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
                      'rounded-[20px] border px-4 py-4 text-left transition-colors',
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

          <div className="hidden lg:block">
            <IssueListTable
              issues={pageItems}
              settings={settings}
              selectedIssueId={selectedIssueId}
              onSelectIssue={onSelectIssue}
              sortKey={sortKey}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              emptyMessage={search.trim()
                ? '검색 조건에 맞는 이슈가 없습니다. 검색 범위를 줄이거나 담당자·번호 기준으로 다시 찾아보세요.'
                : '현재 필터에 맞는 이슈가 없습니다. 필터를 조정하면 전체 흐름으로 다시 확인할 수 있습니다.'}
            />
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
