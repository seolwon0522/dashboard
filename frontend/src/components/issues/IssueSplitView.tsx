'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import HorizontalBarChart from '@/components/charts/HorizontalBarChart'
import IssueDetailDrawer from '@/components/IssueDetailDrawer'
import IssueExplorer from '@/components/IssueExplorer'
import ScopeBadge from '@/components/ScopeBadge'
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

function buildAssigneeFilter(value: string | null, issues: IssueListItem[]): DashboardFilter['assignee'] {
  if (!value) return null

  if (value === 'unassigned') {
    return { id: null, name: '미할당' }
  }

  const parsedId = Number(value)
  if (!Number.isInteger(parsedId)) return null

  const matchedIssue = issues.find((issue) => issue.assigned_to_id === parsedId)
  return {
    id: parsedId,
    name: matchedIssue?.assigned_to ?? `담당자 ${parsedId}`,
  }
}

export default function IssueSplitView({ projectId, issues, model, settings, loading }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [filter, dispatch] = useReducer(filterReducer, EMPTY_FILTER)

  const visibleIssues = useMemo(() => applyDashboardFilter(issues, filter, settings), [filter, issues, settings])

  const handleClearKey = useCallback((key: keyof DashboardFilter) => {
    dispatch({ type: 'CLEAR_KEY', key })
  }, [])

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  const handleSelectPreset = useCallback((preset: DashboardFilter['preset']) => {
    const nextPreset = filter.preset === preset ? null : preset
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextPreset) nextParams.set('preset', nextPreset)
    else nextParams.delete('preset')

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

    if (key === 'assignee' || key === 'statusGroup') {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete(key === 'assignee' ? 'assignee' : 'status')
      router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
      return
    }

    handleClearKey(key)
  }, [handleClearKey, pathname, router, searchParams])

  const handleClearAllFilters = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('preset')
    nextParams.delete('assignee')
    nextParams.delete('status')
    router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false })
    handleClearAll()
  }, [handleClearAll, pathname, router, searchParams])

  const topAction = model.actions.filter((action) => action.count > 0)[0] ?? null

  useEffect(() => {
    const preset = searchParams.get('preset')
    const statusGroup = searchParams.get('status')
    const assignee = searchParams.get('assignee')
    const issueIdParam = searchParams.get('issueId')
    const validStatusGroup = statusGroup && issues.some((issue) => issue.status_group === statusGroup) ? statusGroup : null
    const validAssignee = buildAssigneeFilter(assignee, issues)
    const validPreset = preset && model.explorerPresets.some((item) => item.id === preset)
      ? preset as DashboardFilter['preset']
      : null

    dispatch({
      type: 'SET',
      patch: {
        preset: validPreset,
        statusGroup: validStatusGroup,
        assignee: validAssignee,
      },
    })

    const parsedIssueId = issueIdParam ? Number(issueIdParam) : null
    if (parsedIssueId && Number.isInteger(parsedIssueId)) setSelectedIssueId(parsedIssueId)
    else setSelectedIssueId(null)
  }, [issues, model.explorerPresets, searchParams])

  return (
    <>
      <SectionCard
        title="오늘의 처리 기준"
        subtitle="개요에서 먼저 본 위험 신호를 실제 이슈 큐로 연결하고, 어떤 항목을 지금 볼지 정리합니다."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <ScopeBadge kind="full" label="개요 다음 확인 단계" />
            <ScopeBadge kind="advisory" label="추천 순서 참고" />
          </div>
        }
        density="compact"
        bodyClassName="space-y-3"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="self-start rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">먼저 확인할 항목</div>
            {topAction ? (
              <>
                <div className="mt-2 text-lg font-semibold text-slate-950">{topAction.label} {topAction.count}건</div>
                <p className="mt-2 text-sm leading-5 text-slate-600">{topAction.description}</p>
                <div className="mt-1.5 text-xs text-slate-500">우선 이슈를 바로 열어 원인과 다음 조치를 확인합니다.</div>
                <div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                  {model.actions
                    .filter((action) => action.count > 0)
                    .slice(0, 3)
                    .map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleSelectPreset(action.id)}
                        className="rounded-[16px] border border-white bg-white px-3 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="text-sm font-semibold text-slate-950">{action.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{action.count}건 바로 보기</div>
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm leading-5 text-slate-600">지금은 특정 조치 큐가 두드러지지 않습니다. 전체 이슈 흐름에서 최근 업데이트와 담당 상태를 먼저 확인하면 됩니다.</p>
            )}
          </div>

          <HorizontalBarChart
            title="현재 조치 분포"
            description="각 이슈 유형이 얼마나 쌓여 있는지 한 번에 보고, 바로 해당 큐로 이동합니다."
            items={model.actions.map((action) => ({
              label: action.label,
              count: action.count,
              note: action.description,
              tone: action.tone,
            }))}
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {model.statusSnapshot.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.preset ? handleSelectPreset(item.preset) : undefined}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-950">{item.count}</div>
              <div className="mt-1.5 text-sm leading-5 text-slate-500">{item.note}</div>
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
