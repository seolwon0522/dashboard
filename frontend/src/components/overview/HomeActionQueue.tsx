'use client'

import Link from 'next/link'

import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import { getIssueSignals, type DashboardThresholdSettings, type DashboardModel } from '@/lib/dashboard'

interface Props {
  projectId: string
  model: DashboardModel
  settings: DashboardThresholdSettings
}

export default function HomeActionQueue({ projectId, model, settings }: Props) {
  const visibleActions = model.actions
    .filter((action) => action.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3)

  if (visibleActions.length === 0) {
    return (
      <section className="rounded-[28px] border border-emerald-100 bg-emerald-50 px-6 py-5 text-emerald-950 shadow-sm shadow-emerald-100/60">
        <div className="text-sm font-semibold">즉시 조치 큐가 비어 있습니다.</div>
        <p className="mt-2 text-sm leading-6 text-emerald-900">현재는 안정 상태에 가깝습니다. 전체 작업은 Issues 화면에서 계속 확인할 수 있습니다.</p>
      </section>
    )
  }

  return (
    <SectionCard
      title="즉시 조치 큐"
      subtitle="지금 처리할 항목만 먼저 모았습니다."
      aside={(
        <Link
          href={`/dashboard/${encodeURIComponent(projectId)}/issues`}
          className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
        >
          전체 보기
        </Link>
      )}
      density="primary"
      bodyClassName="grid gap-4 xl:grid-cols-3"
    >
        {visibleActions.map((action) => (
          <article key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-200/10">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-950">{action.label}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-600">{action.description}</p>
              </div>
              <Badge tone={action.tone} size="md">{action.count}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {action.issues.slice(0, 2).map((issue) => (
                <Link
                  key={issue.id}
                  href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=${action.id}`}
                  className="block rounded-xl border border-white bg-white px-4 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-400">#{issue.id}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">{issue.subject}</div>
                      <div className="mt-2 text-xs text-slate-500">{issue.assigned_to ?? '미할당'}</div>
                    </div>
                    <div className="shrink-0 text-xs text-slate-400">{issue.updated_on ?? '업데이트 없음'}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getIssueSignals(issue, settings).slice(0, 2).map((signal) => (
                      <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>{signal.label}</Badge>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </article>
        ))}
    </SectionCard>
  )
}