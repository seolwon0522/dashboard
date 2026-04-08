'use client'

import Link from 'next/link'

import SectionCard from '@/components/SectionCard'
import HomeActionQueue from '@/components/overview/HomeActionQueue'
import HomeFocusCard from '@/components/overview/HomeFocusCard'
import { useDashboardProjectContext } from '@/components/shell/DashboardProjectLayout'

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardPage() {
  const { projectId, model, loading, error, settings } = useDashboardProjectContext()

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
      .slice(0, 3)
    : []

  const compactZeroStates = model?.statusSnapshot.items.filter((item) => item.count === 0).slice(0, 3) ?? []

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-5 sm:px-6">
      {model ? (
        <>
          <HomeFocusCard projectId={projectId} model={model} settings={settings} />
          <HomeActionQueue projectId={projectId} model={model} settings={settings} />

          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard
              title="주의 담당자"
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

            <SectionCard title="흐름 요약" density="secondary" bodyClassName="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">최근 유입 / 완료</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{model.health.recentlyCreatedCount} / {model.health.recentlyCompletedCount}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-500">최근 유입과 완료 흐름</div>
                </div>
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
