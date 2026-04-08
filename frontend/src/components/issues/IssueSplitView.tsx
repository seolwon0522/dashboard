'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import IssueDetailDrawer from '@/components/IssueDetailDrawer'
import IssueExplorer from '@/components/IssueExplorer'
import SectionCard from '@/components/SectionCard'
import { applyDashboardFilter, type DashboardModel, type DashboardThresholdSettings } from '@/lib/dashboard'
import type { DashboardFilter, IssueListItem } from '@/types/dashboard'

interface Props {
  projectId: string
  issues: IssueListItem[]
  model: DashboardModel
  settings: DashboardThresholdSettings
  loading: boolean
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

export default function IssueSplitView({ projectId, issues, model, settings, loading }: Props) {
  const searchParams = useSearchParams()
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [filter, dispatch] = useReducer(filterReducer, EMPTY_FILTER)

  const visibleIssues = useMemo(() => {
    return applyDashboardFilter(issues, filter, settings)
  }, [filter, issues, settings])

  const handleClearKey = useCallback((key: keyof DashboardFilter) => {
    dispatch({ type: 'CLEAR_KEY', key })
  }, [])

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  const handleSelectPreset = useCallback((preset: DashboardFilter['preset']) => {
    dispatch({
      type: 'SET',
      patch: {
        preset: filter.preset === preset ? null : preset,
        statusGroup: null,
      },
    })
  }, [filter.preset])

  useEffect(() => {
    const preset = searchParams.get('preset')

    if (!preset) {
      dispatch({
        type: 'SET',
        patch: {
          preset: null,
        },
      })
      return
    }

    const validPreset = model.explorerPresets.some((item) => item.id === preset)
    if (!validPreset) return

    const nextPreset = preset as DashboardFilter['preset']

    dispatch({
      type: 'SET',
      patch: {
        preset: nextPreset,
        statusGroup: null,
      },
    })
  }, [model.explorerPresets, searchParams])

  return (
    <>
      <SectionCard
        title="Issues Workspace"
        subtitle="우선 확인할 이슈를 정리하고 바로 상세를 확인합니다."
        aside={(
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            홈으로 돌아가기
          </Link>
        )}
        density="compact"
        className="mb-5"
      >
        <></>
      </SectionCard>

      <IssueExplorer
        issues={visibleIssues}
        settings={settings}
        loading={loading}
        selectedIssueId={selectedIssueId}
        filter={filter}
        presets={model.explorerPresets}
        onSelectIssue={setSelectedIssueId}
        onSelectPreset={handleSelectPreset}
        onClearFilter={handleClearKey}
        onClearAll={handleClearAll}
      />

      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onSelectIssue={setSelectedIssueId}
      />
    </>
  )
}