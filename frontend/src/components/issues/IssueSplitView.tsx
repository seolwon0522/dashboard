'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import HorizontalBarChart from '@/components/charts/HorizontalBarChart'
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
  const pathname = usePathname()
  const router = useRouter()
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
    const nextPreset = filter.preset === preset ? null : preset
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextPreset) {
      nextParams.set('preset', nextPreset)
    } else {
      nextParams.delete('preset')
    }

    router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
  }, [filter.preset, pathname, router, searchParams])

  const handleSelectIssue = useCallback((issueId: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('issueId', String(issueId))
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const handleCloseIssue = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('issueId')
    router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleClearFilter = useCallback((key: keyof DashboardFilter) => {
    if (key === 'preset') {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('preset')
      router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
      return
    }

    handleClearKey(key)
  }, [handleClearKey, pathname, router, searchParams])

  const handleClearAllFilters = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('preset')
    router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
    handleClearAll()
  }, [handleClearAll, pathname, router, searchParams])

  const topAction = model.actions
    .filter((action) => action.count > 0)
    .sort((left, right) => right.count - left.count)[0] ?? null

  useEffect(() => {
    const preset = searchParams.get('preset')
    const issueIdParam = searchParams.get('issueId')

    if (!preset) {
      dispatch({
        type: 'SET',
        patch: {
          preset: null,
        },
      })
    } else {
      const validPreset = model.explorerPresets.some((item) => item.id === preset)
      if (validPreset) {
        const nextPreset = preset as DashboardFilter['preset']

        dispatch({
          type: 'SET',
          patch: {
            preset: nextPreset,
            statusGroup: null,
          },
        })
      }
    }

    const parsedIssueId = issueIdParam ? Number(issueIdParam) : null
    if (parsedIssueId && Number.isInteger(parsedIssueId)) {
      setSelectedIssueId(parsedIssueId)
    } else {
      setSelectedIssueId(null)
    }
  }, [model.explorerPresets, searchParams])

  return (
    <>
      <SectionCard
        title="오늘 처리 기준"
        subtitle="먼저 볼 큐를 짧게 정한 뒤 바로 목록으로 내려가도록 상단 정보를 한 번에 정리했습니다."
        density="secondary"
        bodyClassName="space-y-4"
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">지금 가장 먼저 볼 큐</div>
            {topAction ? (
              <>
                <div className="mt-3 text-lg font-semibold text-slate-950">{topAction.label} {topAction.count}건</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{topAction.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {model.actions
                    .filter((action) => action.count > 0)
                    .slice(0, 3)
                    .map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleSelectPreset(action.id)}
                        className="rounded-2xl border border-white bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">바로 보기</div>
                        <div className="mt-2 text-base font-semibold text-slate-950">{action.label}</div>
                        <div className="mt-1 text-sm text-slate-500">{action.count}건</div>
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">지금은 특정 큐가 몰리지 않았습니다. 전체 목록에서 최근 업데이트와 담당 상태를 중심으로 확인하면 됩니다.</p>
            )}
          </div>

          <HorizontalBarChart
            title="현재 큐 분포"
            description="왜 일이 쌓였는지 한 번에 비교하고 바로 해당 큐로 이동할 수 있게 봅니다."
            items={model.actions.map((action) => ({
              label: action.label,
              count: action.count,
              note: action.description,
              tone: action.tone,
            }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.statusSnapshot.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.preset ? handleSelectPreset(item.preset) : undefined}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</div>
              <div className="mt-2 text-sm leading-5 text-slate-500">{item.note}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <IssueExplorer
        issues={visibleIssues}
        settings={settings}
        loading={loading}
        selectedIssueId={selectedIssueId}
        filter={filter}
        presets={model.explorerPresets}
        onSelectIssue={handleSelectIssue}
        onSelectPreset={handleSelectPreset}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
      />

      <IssueDetailDrawer
        issueId={selectedIssueId}
        settings={settings}
        onClose={handleCloseIssue}
        onSelectIssue={handleSelectIssue}
      />
    </>
  )
}