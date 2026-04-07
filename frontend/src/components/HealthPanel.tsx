import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import type { HealthModel } from '@/lib/dashboard'

interface Props {
  health: HealthModel
}

function getBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) return 8
  return Math.max(8, Math.round((value / maxValue) * 56))
}

export default function HealthPanel({ health }: Props) {
  const maxFlow = Math.max(...health.weeklyFlow.flatMap((point) => [point.created, point.closed]), 1)

  return (
    <SectionCard
      title="프로젝트 상태"
      subtitle="기한 초과, 정체, 담당 공백, 최근 처리 흐름을 기준으로 현재 상태를 요약합니다."
      aside={<Badge tone={health.tone}>{health.label}</Badge>}
      bodyClassName="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">상태 점수</div>
              <div className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">{health.score}</div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>완료율 {health.completionRate}%</div>
              <div className="mt-1">사이클 {health.averageCycleDays ?? '—'}일</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">{health.summary}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-400">최근 생성 7일</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{health.createdRecentlyCount}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-400">최근 완료 7일</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{health.closedRecentlyCount}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-400">기한 초과</div>
              <div className="mt-1 text-lg font-semibold text-rose-700">{health.overdueCount}</div>
            </div>
            <div className="rounded-lg bg-white px-3 py-2">
              <div className="text-slate-400">미할당</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{health.unassignedCount}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">유입 대비 처리</div>
                <div className="mt-1 text-sm text-slate-600">최근 생성과 최근 완료의 균형입니다.</div>
              </div>
              <div className={[
                'text-2xl font-semibold tracking-tight',
                health.flowBalance >= 0 ? 'text-emerald-700' : 'text-rose-700',
              ].join(' ')}>
                {health.flowBalance >= 0 ? '+' : ''}{health.flowBalance}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">이슈 경과 구간</div>
            <div className="mt-3 space-y-2">
              {health.agingBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{bucket.label}</span>
                    <span>{bucket.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-400"
                      style={{ width: `${Math.min(100, bucket.count * 14)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">주간 흐름</div>
        <div className="grid grid-cols-6 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          {health.weeklyFlow.map((point) => (
            <div key={point.label} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-16 items-end gap-1">
                <div
                  className="w-3 rounded-t bg-slate-300"
                  style={{ height: `${getBarHeight(point.created, maxFlow)}px` }}
                  title={`생성 ${point.created}`}
                />
                <div
                  className="w-3 rounded-t bg-emerald-400"
                  style={{ height: `${getBarHeight(point.closed, maxFlow)}px` }}
                  title={`완료 ${point.closed}`}
                />
              </div>
              <div className="text-[11px] text-slate-500">{point.label}</div>
              <div className="text-[11px] text-slate-400">{point.created}/{point.closed}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}