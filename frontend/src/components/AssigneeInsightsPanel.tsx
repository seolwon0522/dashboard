'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import { fetchIssueDetail } from '@/lib/api'
import { summarizeAssigneeJournalActivity, type AssigneeJournalInsight, type AssigneeTendencyInsight, type DashboardThresholdSettings } from '@/lib/dashboard'

interface Props {
  insights: AssigneeTendencyInsight[]
  settings: DashboardThresholdSettings
  mode?: 'condensed' | 'focused'
  selectedKey?: string | null
  onSelectKey?: (key: string | null) => void
  onSelectIssue: (issueId: number) => void
}

interface DetailState {
  loading: boolean
  error: string | null
  data: AssigneeJournalInsight | null
}

function Sparkline({ values }: { values: number[] }) {
  const maxValue = Math.max(...values, 1)

  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="w-2 rounded-t bg-slate-300"
          style={{ height: `${Math.max(6, Math.round((value / maxValue) * 36))}px` }}
          title={`${value}건`}
        />
      ))}
    </div>
  )
}

function DetailPanel({ detail, onSelectIssue }: { detail: AssigneeJournalInsight; onSelectIssue: (issueId: number) => void }) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">표본 이슈</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{detail.sampleSize}건</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">메모 빈도</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{detail.notesPerIssue}회</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">상태/진행 갱신</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{detail.changeEventsPerIssue}회</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">이력 간격</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{detail.averageJournalGapDays ?? '—'}일</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="text-sm font-semibold text-slate-900">추가 관찰</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {detail.observations.length > 0 ? detail.observations.map((observation) => (
            <Badge key={observation} tone="neutral">{observation}</Badge>
          )) : <span className="text-xs text-slate-400">추가 관찰 포인트가 충분하지 않습니다.</span>}
        </div>
        <p className="mt-3 text-sm text-slate-600">{detail.interpretation}</p>
      </div>

      <div>
        <div className="text-sm font-semibold text-slate-900">표본 이슈</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {detail.issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => onSelectIssue(issue.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:border-slate-300"
            >
              <div className="font-semibold text-slate-900">#{issue.id}</div>
              <div className="mt-1 max-w-[220px] truncate">{issue.subject}</div>
              <div className="mt-1 text-slate-500">{issue.status} · 진행 {issue.done_ratio}%</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AssigneeInsightsPanel({ insights, settings, mode = 'condensed', selectedKey: controlledSelectedKey, onSelectKey, onSelectIssue }: Props) {
  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, DetailState>>({})

  const selectedKey = controlledSelectedKey !== undefined ? controlledSelectedKey : internalSelectedKey
  const focusedInsight = useMemo(() => {
    if (insights.length === 0) return null
    if (selectedKey) {
      return insights.find((insight) => insight.key === selectedKey) ?? insights[0]
    }
    return insights[0]
  }, [insights, selectedKey])

  const loadDetail = useCallback(async (insight: AssigneeTendencyInsight) => {
    if (insight.sampleIssueIds.length === 0) {
      setDetailMap((current) => ({
        ...current,
        [insight.key]: {
          loading: false,
          error: null,
          data: {
            sampleSize: 0,
            notesPerIssue: 0,
            changeEventsPerIssue: 0,
            averageJournalGapDays: null,
            lateStageChangeRatio: null,
            observations: [],
            interpretation: '표본으로 확인할 최근 이슈가 없습니다.',
            issues: [],
          },
        },
      }))
      return
    }

    setDetailMap((current) => ({
      ...current,
      [insight.key]: {
        loading: true,
        error: null,
        data: current[insight.key]?.data ?? null,
      },
    }))

    try {
      const details = await Promise.all(insight.sampleIssueIds.map((issueId) => fetchIssueDetail(issueId)))
      const summary = summarizeAssigneeJournalActivity(details, settings)
      setDetailMap((current) => ({
        ...current,
        [insight.key]: {
          loading: false,
          error: null,
          data: summary,
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : '상세 근거를 불러오지 못했습니다.'
      setDetailMap((current) => ({
        ...current,
        [insight.key]: {
          loading: false,
          error: message,
          data: null,
        },
      }))
    }
  }, [settings])

  useEffect(() => {
    if (mode !== 'focused' || !focusedInsight) return
    if (detailMap[focusedInsight.key]) return
    void loadDetail(focusedInsight)
  }, [detailMap, focusedInsight, loadDetail, mode])

  function toggleInsight(insight: AssigneeTendencyInsight) {
    const nextSelected = selectedKey === insight.key ? null : insight.key
    if (onSelectKey) {
      onSelectKey(nextSelected)
    } else {
      setInternalSelectedKey(nextSelected)
    }

    if (nextSelected && !detailMap[insight.key]) {
      void loadDetail(insight)
    }
  }

  if (mode === 'focused') {
    if (!focusedInsight) {
      return (
        <SectionCard
          title="선택한 작업 패턴"
          subtitle="담당자를 선택하면 작업 흐름의 근거를 바로 확인할 수 있습니다."
          aside={<Badge tone="info" size="md">패턴 근거</Badge>}
          density="primary"
          bodyClassName="space-y-4"
        >
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            선택한 담당자에 표시할 작업 패턴이 없습니다.
          </div>
        </SectionCard>
      )
    }

    const detail = detailMap[focusedInsight.key]

    return (
      <SectionCard
        title="선택한 작업 패턴"
        subtitle="선택한 담당자의 현재 작업 흐름과 근거를 확인합니다."
        aside={<Badge tone="info" size="md">활성 {focusedInsight.activeCount}건</Badge>}
        density="primary"
        bodyClassName="space-y-5"
      >
        <div className="rounded-[24px] border border-slate-900 bg-slate-950 px-5 py-5 text-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.85)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white">{focusedInsight.assignee.name}</div>
              <p className="mt-2 text-sm leading-6 text-slate-200">{focusedInsight.interpretation}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {focusedInsight.tendencyTags.slice(0, 2).map((tag) => (
              <Badge key={`${focusedInsight.key}-${tag.label}`} tone={tag.tone} className="border-white/10 bg-white/10 text-white">{tag.label}</Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">핵심 근거</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {focusedInsight.evidence.map((item) => (
              <div key={`${focusedInsight.key}-${item.label}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/20">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/20">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">최근 6주 완료 흐름</div>
            <div className="text-xs text-slate-500">패턴 추이</div>
          </div>
          <div className="mt-3">
            <Sparkline values={focusedInsight.sparkline} />
          </div>
        </div>

        {detail?.loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">최근 이력 표본을 불러오는 중입니다...</div>
        ) : detail?.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{detail.error}</div>
        ) : detail?.data ? (
          <DetailPanel detail={detail.data} onSelectIssue={onSelectIssue} />
        ) : null}
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="팀 전체 작업 패턴"
      subtitle="점검이 필요한 흐름을 먼저 고르고, 선택한 담당자를 우측에서 자세히 확인합니다."
      aside={<Badge tone="info" size="md">운영 관찰</Badge>}
      density="secondary"
      bodyClassName="space-y-4"
    >
      {insights.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-400">작업 패턴을 읽을 데이터가 아직 충분하지 않습니다.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => {
            const isSelected = selectedKey === insight.key

            return (
              <Fragment key={insight.key}>
                <article className={[
                  'rounded-2xl border px-4 py-4 transition-colors',
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-200/30'
                    : 'border-slate-200 bg-white shadow-sm shadow-slate-100',
                ].join(' ')}>
                  <button type="button" onClick={() => toggleInsight(insight)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={['text-lg font-semibold', isSelected ? 'text-white' : 'text-slate-950'].join(' ')}>{insight.assignee.name}</div>
                        <p className={['mt-2 text-sm leading-6', isSelected ? 'text-slate-200' : 'text-slate-600'].join(' ')}>{insight.interpretation}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone={isSelected ? 'neutral' : 'info'} className={isSelected ? 'border-white/10 bg-white/10 text-white' : ''}>활성 {insight.activeCount}건</Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {insight.tendencyTags.slice(0, 2).map((tag) => (
                        <Badge key={`${insight.key}-${tag.label}`} tone={tag.tone}>{tag.label}</Badge>
                      ))}
                    </div>

                    <div className={['mt-4 text-xs font-medium', isSelected ? 'text-slate-300' : 'text-slate-500'].join(' ')}>선택해 우측에서 보기</div>
                  </button>
                </article>
              </Fragment>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}