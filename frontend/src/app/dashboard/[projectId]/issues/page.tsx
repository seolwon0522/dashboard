'use client'

import IssueSplitView from '@/components/issues/IssueSplitView'
import { useDashboardProjectContext } from '@/components/shell/DashboardProjectLayout'

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
}

export default function DashboardIssuesPage() {
  const { projectId, issueList, model, loading, error, settings } = useDashboardProjectContext()

  if (!loading && error) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <div className="font-semibold">작업 화면 데이터를 불러오지 못했습니다</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-4 py-5 sm:px-6">
      {model ? (
        <IssueSplitView
          projectId={projectId}
          issues={issueList?.issues ?? []}
          model={model}
          settings={settings}
          loading={loading}
        />
      ) : (
        <>
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-[520px]" />
        </>
      )}
    </main>
  )
}