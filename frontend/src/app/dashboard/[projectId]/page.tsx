'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import ActionPanel from '@/components/ActionPanel'
import Badge from '@/components/Badge'
import ComparisonTrendChart from '@/components/charts/ComparisonTrendChart'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart'
import IssueListTable, { sortIssues } from '@/components/IssueListTable'
import KPICard from '@/components/KPICard'
import ScopeBadge from '@/components/ScopeBadge'
import SectionCard from '@/components/SectionCard'
import UserInsightCard from '@/components/UserInsightCard'
import { useDashboardProjectContext } from '@/components/shell/DashboardProjectLayout'
import { buildDashboardModel } from '@/lib/dashboard'
import { parseLocalDate } from '@/lib/dashboard/date'

type FocusWindow = '7d' | '30d' | 'all'

const FOCUS_WINDOW_OPTIONS: Array<{ id: FocusWindow; label: string; description: string }> = [
  { id: '7d', label: '7일', description: '최근 7일 운영 신호' },
  { id: '30d', label: '30일', description: '최근 30일 흐름 비교' },
  { id: 'all', label: '전체', description: '전체 누적 흐름' },
]

const FULL_PROJECT_SCOPE_LABEL = '전체 프로젝트 기준'

function isIssueInFocusWindow(
  issue: NonNullable<ReturnType<typeof useDashboardProjectContext>['issueList']>['issues'][number],
  days: number | null,
  staleDays: number,
) {
  if (days === null) return true

  const threshold = new Date()
  threshold.setDate(threshold.getDate() - days)

  const createdOn = parseLocalDate(issue.created_on)
  const updatedOn = parseLocalDate(issue.updated_on)
  const latestActivity = updatedOn ?? createdOn

  if (latestActivity && latestActivity >= threshold) {
    return true
  }

  return issue.is_overdue || issue.is_due_soon || issue.days_since_update !== null && issue.days_since_update >= staleDays
}

function buildFlowPointsForWindow(
  issues: NonNullable<ReturnType<typeof useDashboardProjectContext>['issueList']>['issues'],
  window: FocusWindow,
) {
  if (window === 'all') return null

  const bucketSize = window === '7d' ? 1 : 5
  const bucketCount = window === '7d' ? 7 : 6
  const today = new Date()

  return Array.from({ length: bucketCount }, (_, index) => {
    const offset = (bucketCount - 1 - index) * bucketSize
    const start = new Date(today)
    start.setDate(today.getDate() - offset)
    const end = new Date(start)
    end.setDate(start.getDate() + bucketSize - 1)

    const created = issues.filter((issue) => {
      const createdOn = parseLocalDate(issue.created_on)
      return createdOn !== null && createdOn >= start && createdOn <= end
    }).length

    const closed = issues.filter((issue) => {
      if (issue.status_group !== 'closed') return false
      const updatedOn = parseLocalDate(issue.updated_on)
      return updatedOn !== null && updatedOn >= start && updatedOn <= end
    }).length

    return {
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      primary: created,
      secondary: closed,
    }
  })
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardPage() {
  const { projectId, summary, issueList, model, loading, error, settings, lastSynced } = useDashboardProjectContext()
  const [focusWindow, setFocusWindow] = useState<FocusWindow>('7d')

  if (!loading && error) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 pb-8 pt-4 sm:px-6">
        <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <div className="font-semibold">대시보드 데이터를 불러오지 못했습니다.</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </div>
      </main>
    )
  }

  const previewIssues = useMemo(() => {
    if (!issueList || !model) return []

    const focusDays = focusWindow === 'all' ? null : Number.parseInt(focusWindow, 10)
    const filteredIssues = issueList.issues.filter((issue) => isIssueInFocusWindow(issue, focusDays, settings.staleDays))
    const sourceIssues = filteredIssues.length > 0 ? filteredIssues : issueList.issues
    return sortIssues(sourceIssues, settings, 'attention', 'desc').slice(0, 8)
  }, [focusWindow, issueList, model, settings])

  const focusModel = useMemo(() => {
    if (!summary || !issueList || !model) return null

    const focusDays = focusWindow === 'all' ? null : Number.parseInt(focusWindow, 10)
    const filteredIssues = issueList.issues.filter((issue) => isIssueInFocusWindow(issue, focusDays, settings.staleDays))
    const sourceIssues = filteredIssues.length > 0 ? filteredIssues : issueList.issues
    return buildDashboardModel(summary, sourceIssues, settings)
  }, [focusWindow, issueList, model, settings, summary])

  const topMembers = useMemo(() => {
    const sourceModel = focusModel ?? model
    if (!sourceModel) return []

    return sourceModel.capacity
      .filter((member) => member.openCount > 0 || member.riskScore > 0)
      .slice(0, 3)
      .map((member) => ({
        member,
        insight: sourceModel.insights.find((insight) => {
          return insight.assignee.id === member.assignee.id && insight.activeCount > 0 && insight.sampleIssueCount >= 2
        }) ?? null,
      }))
  }, [focusModel, model])

  const visibleUserInsights = useMemo(() => topMembers.filter(({ insight }) => insight !== null), [topMembers])
  const visibleTeamFollowUps = useMemo(() => topMembers.slice(0, 2), [topMembers])

  const flowPoints = useMemo(() => {
    if (!issueList || !model) return []
    const ranged = buildFlowPointsForWindow(issueList.issues, focusWindow)
    if (ranged) return ranged
    return model.health.weeklyFlow.map((point) => ({
      label: point.label,
      primary: point.created,
      secondary: point.closed,
    }))
  }, [focusWindow, issueList, model])

  const focusWindowLabel = FOCUS_WINDOW_OPTIONS.find((option) => option.id === focusWindow)?.description ?? '전체 누적 흐름'
  const sourceModel = focusModel ?? model
  const zeroRiskStates = model?.statusSnapshot.items.filter((item) => item.count === 0).slice(0, 3) ?? []
  const prioritySnapshotItems = model?.statusSnapshot.items.slice(0, 4) ?? []
  const stableStateItems = model?.stableState.items.slice(0, 4) ?? []
  const visibleActionCount = sourceModel?.actions.filter((action) => action.count > 0).length ?? 0
  const statusCards = summary ? [
    {
      key: 'open',
      label: '대기 중',
      value: summary.by_status_group.open ?? 0,
      note: '새로 분류하거나 착수할 대기 항목',
      href: `/dashboard/${encodeURIComponent(projectId)}/issues?status=open`,
    },
    {
      key: 'in_progress',
      label: '진행 중',
      value: summary.by_status_group.in_progress ?? 0,
      note: '현재 처리 중인 핵심 작업',
      href: `/dashboard/${encodeURIComponent(projectId)}/issues?status=in_progress`,
    },
    {
      key: 'closed',
      label: '완료',
      value: summary.by_status_group.closed ?? 0,
      note: '최근 해결 완료로 닫힌 작업',
      href: `/dashboard/${encodeURIComponent(projectId)}/issues?status=closed`,
    },
  ] : []

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 pb-5 pt-3 sm:px-6">
      {model ? (
        <>
          <section className="grid gap-4 xl:grid-cols-12 xl:items-start">
            <div className="space-y-3 xl:col-span-8">
              <section className="self-start overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)]">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,#fffdf8_0%,#ffffff_55%,#f8fbff_100%)] px-4 py-4 sm:px-5">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-[0.16em] text-sky-700">운영 판단 레이어</div>
                      <h2 className="mt-1.5 text-[24px] font-semibold leading-[1.18] tracking-tight text-slate-950">{model.summary.headline}</h2>
                      <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-600">{model.health.breakdown.interpretation}</p>

                      <div className="mt-2.5 inline-flex flex-wrap items-center gap-1 rounded-[12px] bg-white/85 p-1 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.22)]">
                        {FOCUS_WINDOW_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setFocusWindow(option.id)}
                            className={[
                              'rounded-[10px] px-3 py-1 text-xs font-semibold transition-colors',
                              focusWindow === option.id
                                ? 'bg-slate-950 text-white'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                            ].join(' ')}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                        <ScopeBadge kind="full" label={FULL_PROJECT_SCOPE_LABEL} />
                        <ScopeBadge kind="window" label={focusWindowLabel} />
                        <ScopeBadge kind="advisory" label="후속 점검 판단" />
                      </div>

                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        여기서는 우선순위만 빠르게 정하고, 실제 조치는 이슈 화면과 팀 화면에서 이어서 확인합니다.
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/80 bg-white/90 px-3 py-3 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.32)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">현재 상태</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={model.health.breakdown.tone} size="md">{model.health.breakdown.label}</Badge>
                        <span className="text-lg font-semibold text-slate-950">점수 {model.health.breakdown.score}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {lastSynced ? `${lastSynced.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 화면 갱신` : '방금 불러온 기준'}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-[14px] border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">즉시 조치</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{visibleActionCount}개</div>
                        </div>
                        <div className="rounded-[14px] border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">안정 신호</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{zeroRiskStates.length}개</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
                    {prioritySnapshotItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=${encodeURIComponent(item.preset ?? 'attention')}`}
                        className="rounded-[16px] border border-white/90 bg-white/90 px-3 py-3 transition-colors hover:border-slate-200 hover:bg-white"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
                        <div className="mt-1.5 flex items-center justify-between gap-3">
                          <span className="text-2xl font-semibold tracking-tight text-slate-950">{item.count}</span>
                          <Badge tone={item.tone}>{item.count > 0 ? '즉시 확인' : '안정'}</Badge>
                        </div>
                        <div className="mt-1.5 text-xs leading-5 text-slate-500">{item.note}</div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-2.5 border-t border-white/80 pt-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold">지연 {model.health.overdueCount}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold">정체 {model.health.staleCount}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold">미할당 {model.health.unassignedCount}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold">평균 리드타임 {model.health.averageCycleDays ?? '—'}일</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <Link
                        href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=attention`}
                        className="rounded-[12px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        우선 확인 이슈 보기
                      </Link>
                      <Link
                        href={`/dashboard/${encodeURIComponent(projectId)}/team`}
                        className="rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                      >
                        팀 후속 점검 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.16)]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">안정 상태 요약</div>
                    <div className="mt-1 text-xs text-slate-500">지금 급한 문제만이 아니라, 유지되고 있는 흐름도 함께 봅니다.</div>
                  </div>
                  <ScopeBadge kind="full" label="전체 흐름 참고" />
                </div>
                <div className="grid gap-px bg-slate-100 md:grid-cols-2 2xl:grid-cols-4">
                  {stableStateItems.map((item) => (
                    <div key={item.id} className="bg-white px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
                      <div className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">{item.value}</div>
                      <div className="mt-1.5 text-sm leading-5 text-slate-600">{item.note}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 2xl:col-span-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">핵심 KPI</div>
                    <div className="mt-1 text-sm text-slate-500">전체 프로젝트 기준 지표를 먼저 보고, 실제 조치는 이슈 큐로 이어집니다.</div>
                  </div>
                  <ScopeBadge kind="full" label={FULL_PROJECT_SCOPE_LABEL} />
                </div>

                {model.summary.cards.map((metric, index) => {
                  const href = metric.preset
                    ? `/dashboard/${encodeURIComponent(projectId)}/issues?preset=${encodeURIComponent(metric.preset)}`
                    : metric.statusGroup
                      ? `/dashboard/${encodeURIComponent(projectId)}/issues?status=${encodeURIComponent(metric.statusGroup)}`
                      : undefined

                  return (
                    <KPICard
                      key={metric.id}
                      projectId={projectId}
                      metric={metric}
                      href={href}
                      emphasis={index < 2 ? 'primary' : 'secondary'}
                      className={index < 2 ? 'md:col-span-2 2xl:col-span-2' : '2xl:col-span-1'}
                    />
                  )
                })}
              </section>
            </div>

            <div className="space-y-3 xl:col-span-4 xl:sticky xl:top-24">
              <ActionPanel projectId={projectId} actions={(sourceModel ?? model).actions} settings={settings} windowLabel={focusWindowLabel} />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-12 xl:items-start">
            <SectionCard
              title="원인과 흐름 진단"
              subtitle={`상태 카드는 전체 프로젝트 기준, 차트는 ${focusWindowLabel} 기준으로 보여줍니다.`}
              aside={
                <div className="flex flex-wrap gap-2">
                  <ScopeBadge kind="full" label="상태 카드" />
                  <ScopeBadge kind="window" label={focusWindowLabel} />
                </div>
              }
              density="primary"
              className="xl:col-span-7"
              bodyClassName="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {statusCards.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3.5 transition-colors hover:border-slate-300 hover:bg-white"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                    <div className="mt-1.5 text-sm leading-5 text-slate-600">{item.note}</div>
                  </Link>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {model.statusSnapshot.items
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=${encodeURIComponent(item.preset ?? 'attention')}`}
                      className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
                          <div className="mt-1.5 text-2xl font-semibold text-slate-950">{item.count}</div>
                        </div>
                        <Badge tone={item.tone}>{item.count > 0 ? '관리 필요' : '안정'}</Badge>
                      </div>
                      <div className="mt-1.5 text-sm leading-5 text-slate-600">{item.note}</div>
                    </Link>
                  ))}
              </div>

              {zeroRiskStates.length > 0 ? (
                <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900">
                  <div className="font-semibold">현재 안정 신호</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {zeroRiskStates.map((item) => (
                      <span key={item.id} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 font-semibold text-emerald-700">
                        {item.label} 0
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 xl:grid-cols-2">
                <ComparisonTrendChart
                  title="유입 대비 완료 추세"
                  description={`${focusWindowLabel} 기준으로 유입과 완료의 균형이 유지되는지 빠르게 확인합니다.`}
                  points={flowPoints}
                  primaryLabel="유입"
                  secondaryLabel="완료"
                />
                <HorizontalBarChart
                  title="업데이트 병목 구간"
                  description="활성 작업이 마지막 업데이트 기준 어느 구간에 몰려 있는지 보여줍니다."
                  items={(sourceModel ?? model).health.agingBuckets.map((bucket, index) => ({
                    label: bucket.label,
                    count: bucket.count,
                    tone: index === (sourceModel ?? model).health.agingBuckets.length - 1 ? 'warning' : index === 0 ? 'success' : 'info',
                  }))}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="담당자 후속 점검 후보"
              subtitle={`${focusWindowLabel} 기준으로 리스크가 높은 담당자만 먼저 보여주고, 자세한 확인은 팀 화면으로 이어집니다.`}
              aside={
                <div className="flex flex-wrap items-center gap-2">
                  <ScopeBadge kind="window" label={focusWindowLabel} />
                  <Link href={`/dashboard/${encodeURIComponent(projectId)}/team`} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950">
                    전체 보기
                  </Link>
                </div>
              }
              density="primary"
              className="xl:col-span-5"
              bodyClassName="space-y-2.5"
            >
              {visibleTeamFollowUps.length > 0 ? visibleTeamFollowUps.map(({ member }) => (
                <div key={member.key} className="flex min-h-[120px] flex-col rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-slate-950">{member.assignee.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                        활성 {member.openCount}건, 지연 {member.overdueCount}건, 정체 {member.staleCount}건이 겹쳐 있어 후속 확인이 필요합니다.
                      </div>
                    </div>
                    <Badge tone={member.band === 'stretched' ? 'danger' : member.band === 'watch' ? 'warning' : 'success'}>
                      {member.band === 'stretched' ? '과부하' : member.band === 'watch' ? '주의' : '안정'}
                    </Badge>
                  </div>

                  <div className="mt-auto pt-3">
                    <Link
                      href={`/dashboard/${encodeURIComponent(projectId)}/team?assignee=${encodeURIComponent(String(member.assignee.id ?? 'unassigned'))}`}
                      className="inline-flex min-h-[40px] items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      담당자 화면 보기
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  지금은 팀 화면으로 바로 이어질 강한 후속 점검 후보가 많지 않습니다.
                </div>
              )}
            </SectionCard>
          </section>

          <SectionCard
            title="담당자 인사이트"
            subtitle={`${focusWindowLabel} 기준으로 개인별 작업 흐름과 후속 점검 후보를 압축해서 보여줍니다.`}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <ScopeBadge kind="window" label={focusWindowLabel} />
                <ScopeBadge kind="advisory" label="참고용 판단 카드" />
                <Link href={`/dashboard/${encodeURIComponent(projectId)}/team`} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950">
                  팀 화면 전체 보기
                </Link>
              </div>
            }
            density="primary"
            bodyClassName="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
          >
            {visibleUserInsights.length > 0 ? visibleUserInsights.map(({ member, insight }) => (
              <UserInsightCard key={`insight-${member.key}`} projectId={projectId} member={member} insight={insight} windowLabel={focusWindowLabel} />
            )) : (
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500 lg:col-span-2 2xl:col-span-3">
                지금은 운영 판단에 바로 쓸 만큼 강한 개인 신호가 많지 않습니다. 팀 화면에서 활성 담당자 중심으로 확인하는 편이 더 적합합니다.
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="이슈 확인 레이어"
            subtitle={`${focusWindowLabel} 기준으로 먼저 볼 이슈를 압축해서 보여주고, 실제 조치는 이슈 큐에서 이어집니다.`}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <ScopeBadge kind="window" label={focusWindowLabel} />
                <Link href={`/dashboard/${encodeURIComponent(projectId)}/issues`} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950">
                  전체 이슈 큐 열기
                </Link>
              </div>
            }
            density="primary"
            bodyClassName="space-y-4"
          >
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">기본 정렬: 조치 우선</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">세부 확인: 행 클릭</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">추가 검증: 이슈 화면</span>
            </div>

            <IssueListTable
              issues={previewIssues}
              settings={settings}
              onSelectIssue={(issueId) => {
                window.location.href = `/dashboard/${encodeURIComponent(projectId)}/issues?issueId=${issueId}`
              }}
              emptyMessage="표시할 우선 이슈가 없습니다. 전체 작업 공간에서 최근 완료 흐름을 확인해 보세요."
              compact
            />
          </SectionCard>
        </>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <SkeletonBlock className="h-[280px]" />
            <SkeletonBlock className="h-[280px]" />
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-[140px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-[200px]" />
            <SkeletonBlock className="h-[200px]" />
            <SkeletonBlock className="h-[200px]" />
            <SkeletonBlock className="h-[200px]" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SkeletonBlock className="h-[420px]" />
            <SkeletonBlock className="h-[420px]" />
          </div>
          <SkeletonBlock className="h-[320px]" />
          <SkeletonBlock className="h-[360px]" />
        </>
      )}
    </main>
  )
}
