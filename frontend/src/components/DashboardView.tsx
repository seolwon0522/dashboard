'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import ActionRequiredPanel from '@/components/ActionRequiredPanel'
import HealthPanel from '@/components/HealthPanel'
import IssueDetailDrawer from '@/components/IssueDetailDrawer'
import IssueExplorer from '@/components/IssueExplorer'
import KpiRow from '@/components/KpiRow'
import ProjectSelect from '@/components/ProjectSelect'
import TeamCapacityPanel from '@/components/TeamCapacityPanel'
import {
  applyDashboardFilter,
  buildDashboardModel,
} from '@/lib/dashboard'
import { fetchAllIssues, fetchSummary } from '@/lib/api'
import { formatSyncedLabel } from '@/lib/labels'
import type {
  AssigneeFilter,
  DashboardFilter,
  DashboardSummary,
  IssueListResponse,
  ProjectItem,
} from '@/types/dashboard'

interface Props {
  projectId: string
  projects: ProjectItem[]
  projectName: string
  onProjectChange: (id: string) => void
}

const EMPTY_FILTER: DashboardFilter = {
  statusGroup: null,
  assignee: null,
  preset: null,
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

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardView({ projectId, projects, projectName, onProjectChange }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [issueList, setIssueList] = useState<IssueListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [filter, dispatch] = useReducer(filterReducer, EMPTY_FILTER)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([fetchSummary(projectId), fetchAllIssues(projectId)])
      .then(([summaryResponse, issueResponse]) => {
        setSummary(summaryResponse)
        setIssueList(issueResponse)
        setLastSynced(new Date())
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false))
  }, [projectId, refreshKey])

  useEffect(() => {
    dispatch({ type: 'CLEAR_ALL' })
    setSelectedIssueId(null)
  }, [projectId])

  const handleRefresh = useCallback(() => setRefreshKey((current) => current + 1), [])

  const handleClearKey = useCallback((key: keyof DashboardFilter) => {
    dispatch({ type: 'CLEAR_KEY', key })
  }, [])

  const handleClearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), [])

  const handleSelectAssignee = useCallback((assignee: AssigneeFilter | null) => {
    dispatch({ type: 'SET', patch: { assignee } })
  }, [])

  const model = useMemo(() => {
    if (!summary || !issueList) return null
    return buildDashboardModel(summary, issueList.issues)
  }, [issueList, summary])

  const filteredIssues = useMemo(() => {
    if (!issueList) return []
    return applyDashboardFilter(issueList.issues, filter)
  }, [filter, issueList])

  const syncedLabel = useMemo(() => {
    if (!lastSynced) return null
    return formatSyncedLabel(lastSynced)
  }, [lastSynced])

  const selectPreset = useCallback((preset: DashboardFilter['preset']) => {
    dispatch({
      type: 'SET',
      patch: {
        preset: filter.preset === preset ? null : preset,
        statusGroup: null,
      },
    })
  }, [filter.preset])

  const selectKpi = useCallback((config: { statusGroup?: string | null; preset?: DashboardFilter['preset'] }) => {
    const nextStatusGroup = config.statusGroup ?? null
    const nextPreset = config.preset ?? null
    const isSameSelection = filter.statusGroup === nextStatusGroup && filter.preset === nextPreset

    dispatch({
      type: 'SET',
      patch: {
        statusGroup: isSameSelection ? null : nextStatusGroup,
        preset: isSameSelection ? null : nextPreset,
      },
    })
  }, [filter.preset, filter.statusGroup])

  const header = (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="프로젝트 목록으로">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="mr-auto min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">운영 대시보드</div>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-slate-900">{projectName}</h1>
            <span className="hidden text-xs text-slate-400 sm:inline">관리 중심 Redmine 현황판</span>
          </div>
        </div>

        <ProjectSelect projects={projects} selectedId={projectId} onChange={(id) => id && onProjectChange(id)} />

        {syncedLabel ? <span className="hidden text-xs text-slate-400 lg:inline">{syncedLabel}</span> : null}

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
          title="대시보드 새로고침"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  if (!loading && error) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
          <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <div className="font-semibold">대시보드 데이터를 불러오지 못했습니다</div>
            <div className="mt-1 text-xs text-rose-600">{error}</div>
            <button type="button" onClick={handleRefresh} className="mt-3 text-xs font-medium underline">
              다시 시도
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {header}

      <main className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-5 sm:px-6">
        {model ? (
          <KpiRow kpis={model.kpis} filter={filter} onSelect={selectKpi} />
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28" />
            ))}
          </div>
        )}

        {model ? (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <ActionRequiredPanel
              actions={model.actions}
              activePreset={filter.preset}
              onSelectPreset={selectPreset}
              onSelectIssue={setSelectedIssueId}
            />
            <HealthPanel health={model.health} />
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <SkeletonBlock className="h-[420px]" />
            <SkeletonBlock className="h-[420px]" />
          </div>
        )}

        {model ? (
          <TeamCapacityPanel
            members={model.capacity}
            activeAssignee={filter.assignee}
            onSelectAssignee={handleSelectAssignee}
          />
        ) : (
          <SkeletonBlock className="h-[260px]" />
        )}

        <IssueExplorer
          issues={filteredIssues}
          loading={loading}
          selectedIssueId={selectedIssueId}
          filter={filter}
          presets={model?.explorerPresets ?? []}
          onSelectIssue={setSelectedIssueId}
          onSelectPreset={selectPreset}
          onClearFilter={handleClearKey}
          onClearAll={handleClearAll}
        />
      </main>

      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onSelectIssue={setSelectedIssueId}
      />
    </div>
  )
}