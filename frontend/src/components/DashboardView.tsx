'use client'

// 대시보드 메인 오케스트레이터
// 헤더, KPI, 워크로드, 상태 분포, 주의 이슈, 이슈 테이블 통합 관리
// 공유 필터 상태로 모든 위젯이 연동됨
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import AttentionPanel from '@/components/AttentionPanel'
import FilterChips from '@/components/FilterChips'
import IssueDetailDrawer from '@/components/IssueDetailDrawer'
import IssueTable from '@/components/IssueTable'
import KpiRow from '@/components/KpiRow'
import MemberModal from '@/components/MemberModal'
import ProjectSelect from '@/components/ProjectSelect'
import StatusDistribution from '@/components/StatusDistribution'
import WorkloadBar from '@/components/WorkloadBar'
import {
  fetchAllIssues,
  fetchSummary,
  fetchWorkload,
} from '@/lib/api'
import { formatSyncedLabel } from '@/lib/labels'
import type {
  AssigneeFilter,
  DashboardFilter,
  DashboardSummary,
  IssueListItem,
  IssueListResponse,
  ProjectItem,
  WorkloadItem,
  WorkloadResponse,
} from '@/types/dashboard'

interface Props {
  projectId: string
  projects: ProjectItem[]
  projectName: string
  onProjectChange: (id: string) => void
}

// ── Filter state management ──────────────────────────────────────────────────

const EMPTY_FILTER: DashboardFilter = {
  statusGroup: null,
  assignee: null,
  onlyOverdue: false,
}

type FilterAction =
  | { type: 'SET'; patch: Partial<DashboardFilter> }
  | { type: 'CLEAR_KEY'; key: keyof DashboardFilter }
  | { type: 'CLEAR_ALL' }

function filterReducer(state: DashboardFilter, action: FilterAction): DashboardFilter {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.patch }
    case 'CLEAR_KEY':
      return { ...state, [action.key]: EMPTY_FILTER[action.key] }
    case 'CLEAR_ALL':
      return EMPTY_FILTER
  }
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-gray-100 animate-pulse ${className}`} />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardView({ projectId, projects, projectName, onProjectChange }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [workload, setWorkload] = useState<WorkloadResponse | null>(null)
  const [issueList, setIssueList] = useState<IssueListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedMember, setSelectedMember] = useState<WorkloadItem | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)

  const [filter, dispatch] = useReducer(filterReducer, EMPTY_FILTER)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([fetchSummary(projectId), fetchWorkload(projectId), fetchAllIssues(projectId)])
      .then(([s, w, il]) => {
        setSummary(s)
        setWorkload(w)
        setIssueList(il)
        setLastSynced(new Date())
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId, refreshKey])

  // Reset filter and selected issue when project changes
  useEffect(() => {
    dispatch({ type: 'CLEAR_ALL' })
    setSelectedIssueId(null)
  }, [projectId])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const handleFilterChange = useCallback((patch: Partial<DashboardFilter>) => {
    dispatch({ type: 'SET', patch })
  }, [])

  const handleClearKey = useCallback((key: keyof DashboardFilter) => {
    dispatch({ type: 'CLEAR_KEY', key })
  }, [])

  const handleClearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), [])

  const handleAssigneeFilter = useCallback((af: AssigneeFilter | null) => {
    dispatch({ type: 'SET', patch: { assignee: af } })
  }, [])

  const handleOpenModal = useCallback((item: WorkloadItem) => {
    setSelectedMember(item)
  }, [])

  // ── Derived state ───────────────────────────────────────────────────────────
  const filteredIssues = useMemo<IssueListItem[]>(() => {
    if (!issueList) return []
    let result = issueList.issues

    if (filter.statusGroup) {
      result = result.filter((i) => i.status_group === filter.statusGroup)
    }
    if (filter.assignee !== null) {
      const { id } = filter.assignee
      result =
        id === null
          ? result.filter((i) => i.assigned_to_id === null)
          : result.filter((i) => i.assigned_to_id === id)
    }
    if (filter.onlyOverdue) {
      result = result.filter((i) => i.is_overdue)
    }
    return result
  }, [issueList, filter])

  const syncedLabel = useMemo(() => {
    if (!lastSynced) return null
    return formatSyncedLabel(lastSynced)
  }, [lastSynced])

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          title="Back to project list"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-baseline gap-2 mr-auto min-w-0">
          <h1 className="text-sm font-bold text-gray-800 whitespace-nowrap shrink-0">
            Redmine Dashboard
          </h1>
          <span className="text-gray-300 hidden sm:inline shrink-0">/</span>
          <span
            className="text-sm font-medium text-gray-500 hidden sm:block truncate"
            title={projectName}
          >
            {projectName}
          </span>
        </div>

        <ProjectSelect
          projects={projects}
          selectedId={projectId}
          onChange={(id) => id && onProjectChange(id)}
        />

        {syncedLabel && (
          <span className="text-xs text-gray-400 hidden md:inline whitespace-nowrap shrink-0">
            {syncedLabel}
          </span>
        )}

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          title="데이터 새로고침"
          aria-label="데이터 새로고침"
          className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 shrink-0"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </header>
  )

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm max-w-xl">
            <p className="font-semibold">Failed to load dashboard data</p>
            <p className="mt-1 text-red-600 text-xs">{error}</p>
            <p className="mt-1 text-red-500 text-xs">
              Ensure the backend server (port 8000) is running.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {header}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-5 space-y-5">

        {/* KPI row */}
        {summary ? (
          <KpiRow summary={summary} filter={filter} onFilterChange={handleFilterChange} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} className="h-[72px]" />
            ))}
          </div>
        )}

        {/* Two-column analytics + attention */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Workload + Status Distribution */}
          <div className="space-y-4">
            <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h2 className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Workload
              </h2>
              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} className="h-8" />
                  ))}
                </div>
              ) : (
                <WorkloadBar
                  workload={workload?.workload ?? []}
                  activeAssignee={filter.assignee}
                  onFilter={handleAssigneeFilter}
                  onOpenModal={handleOpenModal}
                />
              )}
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-3">
              <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Status Distribution
              </h2>
              {summary ? (
                <StatusDistribution
                  summary={summary}
                  filter={filter}
                  onFilterChange={handleFilterChange}
                />
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} className="h-10" />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: Attention panel */}
          <div className="lg:col-span-2">
            <AttentionPanel issues={issueList?.issues ?? []} loading={loading} />
          </div>
        </div>

        {/* Issue table */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Issue List
            </h2>
            {issueList && (
              <span className="text-xs text-gray-400">
                {issueList.total.toLocaleString()} issues
              </span>
            )}
          </div>
          <FilterChips filter={filter} onClear={handleClearKey} onClearAll={handleClearAll} />
          <IssueTable
            issues={filteredIssues}
            loading={loading}
            selectedIssueId={selectedIssueId}
            onSelectIssue={setSelectedIssueId}
          />
        </section>
      </main>

      {/* Member detail modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          projectId={projectId}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Issue detail drawer */}
      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
      />
    </div>
  )
}
