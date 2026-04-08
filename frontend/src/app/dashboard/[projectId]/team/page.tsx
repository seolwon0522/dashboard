'use client'

import TeamOverviewSection from '@/components/team/TeamOverviewSection'
import { useDashboardProjectContext } from '@/components/shell/DashboardProjectLayout'

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardTeamPage() {
  const { model, loading, error, settings } = useDashboardProjectContext()

  if (!loading && error) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <div className="font-semibold">팀 분석 데이터를 불러오지 못했습니다</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-5 sm:px-6">
      {model ? (
        <TeamOverviewSection model={model} settings={settings} />
      ) : (
        <>
          <SkeletonBlock className="h-28" />
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <SkeletonBlock className="h-[320px]" />
            <SkeletonBlock className="h-[320px]" />
          </div>
          <SkeletonBlock className="h-[280px]" />
        </>
      )}
    </main>
  )
}