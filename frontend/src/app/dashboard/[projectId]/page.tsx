'use client'

import Link from 'next/link'
import { useState } from 'react'

import ComparisonTrendChart from '@/components/charts/ComparisonTrendChart'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart'
import SectionCard from '@/components/SectionCard'
import HomeActionQueue from '@/components/overview/HomeActionQueue'
import HomeFocusCard from '@/components/overview/HomeFocusCard'
import { useDashboardProjectContext } from '@/components/shell/DashboardProjectLayout'

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardPage() {
  const { projectId, model, loading, error, settings } = useDashboardProjectContext()
  const [showFlowDetail, setShowFlowDetail] = useState(false)

  if (!loading && error) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <div className="font-semibold">대시보드 데이터를 불러오지 못했습니다</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </div>
      </main>
    )
  }

  const topMembers = model
    ? [...model.capacity]
      .sort((left, right) => {
        if (right.riskScore !== left.riskScore) return right.riskScore - left.riskScore
        return right.openCount - left.openCount
      })
      .slice(0, 2)
    : []

  const compactZeroStates = model?.statusSnapshot.items.filter((item) => item.count === 0).slice(0, 3) ?? []

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      {model ? (
        <>
          <HomeFocusCard projectId={projectId} model={model} settings={settings} />
          <HomeActionQueue projectId={projectId} model={model} settings={settings} />

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard
              title="원인 빠른 확인"
              subtitle="지금 병목에 가까운 담당자만 짧게 보고, 자세한 비교는 팀 화면에서 이어서 봅니다."
              aside={(
                <Link
                  href={`/dashboard/${encodeURIComponent(projectId)}/team`}
                  className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
                >
                  팀 분석 보기
                </Link>
              )}
              density="secondary"
              bodyClassName="space-y-3"
            >
                {topMembers.length > 0 ? topMembers.map((member) => (
                  <div key={member.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{member.assignee.name}</div>
                        <div className="mt-1 text-sm leading-5 text-slate-500">활성 {member.openCount}건 · 지연 {member.overdueCount}건</div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>정체 {member.staleCount}건</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-400">
                    현재 주의 담당자가 없습니다.
                  </div>
                )}
            </SectionCard>

            <SectionCard title="흐름 빠른 확인" subtitle="지금 흐름이 무너지는지 여부만 먼저 확인합니다." density="secondary" bodyClassName="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">처리 흐름</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{model.health.flowBalance > 0 ? '+' : ''}{model.health.flowBalance}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-500">유입 대비 완료 차이</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">정체 / 미할당</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{model.health.staleCount} / {model.health.unassignedCount}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-500">지금 재분배가 필요한 상태</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">최근 완료</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{model.health.recentlyCompletedCount}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-500">최근 처리 흐름 유지 여부 확인용</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">상세 흐름 보기</div>
                    <div className="mt-1 text-sm leading-5 text-slate-500">유입/완료 추이와 업데이트 정체 분포가 필요할 때만 펼쳐서 봅니다.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFlowDetail((current) => !current)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950"
                  >
                    {showFlowDetail ? '상세 흐름 접기' : '상세 흐름 펼치기'}
                  </button>
                </div>

                {showFlowDetail ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <ComparisonTrendChart
                      title="최근 유입과 완료"
                      description="최근 6주 동안 새로 들어온 작업과 닫힌 작업 흐름입니다."
                      points={model.health.weeklyFlow.map((point) => ({
                        label: point.label,
                        primary: point.created,
                        secondary: point.closed,
                      }))}
                      primaryLabel="유입"
                      secondaryLabel="완료"
                    />
                    <HorizontalBarChart
                      title="업데이트 정체 구간"
                      description="활성 작업이 마지막 업데이트 이후 어느 구간에 몰려 있는지 보여줍니다."
                      items={model.health.agingBuckets.map((bucket, index) => ({
                        label: bucket.label,
                        count: bucket.count,
                        tone: index === model.health.agingBuckets.length - 1 ? 'warning' : index === 0 ? 'success' : 'info',
                      }))}
                    />
                  </div>
                ) : null}
              </div>

              {compactZeroStates.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">안정 상태</span>
                  {compactZeroStates.map((item) => (
                    <span key={item.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {item.label} 0
                    </span>
                  ))}
                </div>
              ) : null}
            </SectionCard>
          </section>
        </>
      ) : (
        <>
          <SkeletonBlock className="h-[320px]" />
          <SkeletonBlock className="h-[280px]" />
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <SkeletonBlock className="h-[280px]" />
            <SkeletonBlock className="h-[280px]" />
          </div>
        </>
      )}
    </main>
  )
}
