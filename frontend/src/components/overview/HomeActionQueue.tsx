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
      <section className="rounded-[24px] border border-[#d4f0df] bg-[#edf9f2] px-6 py-6 text-[#0f8a4b] shadow-[0_10px_28px_-28px_rgba(15,23,42,0.2)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">즉시 조치 큐가 비어 있습니다.</div>
            <p className="mt-2 text-sm leading-6 text-[#267d56]">긴급 신호는 크지 않습니다. 아래 항목만 짧게 확인하면 현재 흐름을 유지하는 데 충분합니다.</p>
          </div>
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}/issues`}
            className="rounded-[14px] border border-[#c0e8d0] bg-white px-4 py-3 text-sm font-semibold text-[#0f8a4b] transition hover:bg-[#f7fcf9]"
          >
            전체 작업 보기
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.stableState.items.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-white bg-white px-4 py-4">
              <div className="text-xs font-semibold text-[#6b7684]">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-[#191f28]">{item.value}</div>
              <div className="mt-2 text-sm leading-5 text-[#4e5968]">{item.note}</div>
            </div>
          ))}
        </div>
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
          <article key={action.id} className="rounded-[20px] border border-[#e6ebf1] bg-[#f9fbfd] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#191f28]">{action.label}</h3>
                <p className="mt-2 text-sm leading-5 text-[#4e5968]">{action.description}</p>
              </div>
              <Badge tone={action.tone} size="md">{action.count}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {action.issues.slice(0, 2).map((issue) => (
                <Link
                  key={issue.id}
                  href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=${encodeURIComponent(action.id)}&issueId=${issue.id}`}
                  className="block rounded-[16px] border border-[#e6ebf1] bg-white px-4 py-3 transition-colors hover:border-[#d6e8ff] hover:bg-[#f9fbfd]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-400">#{issue.id}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">{issue.subject}</div>
                      <div className="mt-2 text-xs text-[#6b7684]">{issue.assigned_to ?? '미할당'}</div>
                    </div>
                    <div className="shrink-0 text-xs text-[#8b95a1]">{issue.updated_on ?? '업데이트 없음'}</div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getIssueSignals(issue, settings).slice(0, 2).map((signal) => (
                      <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>{signal.label}</Badge>
                    ))}
                  </div>

                  <div className="mt-3 text-[11px] font-semibold text-[#3182f6]">작업 화면에서 바로 열기</div>
                </Link>
              ))}
            </div>
          </article>
        ))}
    </SectionCard>
  )
}