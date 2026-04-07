'use client'

import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import { getIssueSignals, type ActionBucketModel } from '@/lib/dashboard'
import type { IssuePreset } from '@/types/dashboard'

interface Props {
  actions: ActionBucketModel[]
  activePreset: IssuePreset | null
  onSelectPreset: (preset: IssuePreset) => void
  onSelectIssue: (issueId: number) => void
}

export default function ActionRequiredPanel({
  actions,
  activePreset,
  onSelectPreset,
  onSelectIssue,
}: Props) {
  const totalAttention = new Set(actions.flatMap((action) => action.issues.map((issue) => issue.id))).size

  return (
    <SectionCard
      title="즉시 조치 필요"
      subtitle="전체 이슈를 먼저 훑지 않아도 되도록, 관리자가 바로 판단해야 할 항목을 큐 단위로 모았습니다."
      aside={<Badge tone={totalAttention > 0 ? 'warning' : 'success'}>{totalAttention}건 집중</Badge>}
      bodyClassName="space-y-3"
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {actions.map((action) => {
          const isActive = activePreset === action.id

          return (
            <div
              key={action.id}
              className={[
                'rounded-xl border p-3 transition-all',
                isActive ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-slate-50/60',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelectPreset(action.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{action.label}</h3>
                    <Badge tone={action.tone}>{action.count}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                </div>
                <span className="text-xs font-medium text-slate-400">목록 보기</span>
              </button>

              <div className="mt-3 space-y-2">
                {action.issues.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-sm text-slate-400">
                    {action.emptyLabel}
                  </div>
                ) : (
                  action.issues.map((issue) => {
                    const signals = getIssueSignals(issue).slice(0, 2)

                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => onSelectIssue(issue.id)}
                        className="w-full rounded-lg border border-white bg-white px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-400">#{issue.id}</div>
                            <div className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{issue.subject}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {issue.assigned_to ?? '미할당'}
                              {issue.tracker ? ` • ${issue.tracker}` : ''}
                            </div>
                          </div>
                          <div className="shrink-0 text-[11px] text-slate-400">
                            {issue.updated_on ?? '업데이트 없음'}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {signals.map((signal) => (
                            <Badge key={`${issue.id}-${signal.label}`} tone={signal.tone}>
                              {signal.label}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}