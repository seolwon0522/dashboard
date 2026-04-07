'use client'

// 이슈 상태 분포 위젯 — 클릭 시 이슈 테이블 필터링
import type { DashboardFilter, DashboardSummary } from '@/types/dashboard'

interface Props {
  summary: DashboardSummary
  filter: DashboardFilter
  onFilterChange: (patch: Partial<DashboardFilter>) => void
}

const STATUS_CONFIG = [
  {
    key: 'open',
    label: 'Open',
    barColor: 'bg-yellow-400',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    ringColor: 'ring-yellow-300',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    barColor: 'bg-blue-400',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    ringColor: 'ring-blue-300',
  },
  {
    key: 'closed',
    label: 'Closed',
    barColor: 'bg-green-400',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    ringColor: 'ring-green-300',
  },
]

export default function StatusDistribution({ summary, filter, onFilterChange }: Props) {
  const total = summary.total || 1

  const toggle = (key: string) => {
    onFilterChange({ statusGroup: filter.statusGroup === key ? null : key })
  }

  return (
    <div className="space-y-1.5">
      {STATUS_CONFIG.map((s) => {
        const count = summary.by_status_group[s.key] ?? 0
        const pct = Math.round((count / total) * 100)
        const isActive = filter.statusGroup === s.key

        return (
          <button
            key={s.key}
            type="button"
            onClick={() => toggle(s.key)}
            className={[
              'w-full text-left rounded-md px-2.5 py-2 transition-all border',
              isActive
                ? `${s.bgColor} ${s.borderColor} ring-1 ${s.ringColor}`
                : 'bg-white border-transparent hover:bg-gray-50',
            ].join(' ')}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${s.barColor} shrink-0`} />
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm tabular-nums font-bold ${isActive ? s.textColor : 'text-gray-800'}`}>
                  {count.toLocaleString()}
                </span>
                <span className="text-[11px] tabular-nums text-gray-400 w-9 text-right">{pct}%</span>
              </div>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${s.barColor} rounded-full transition-all duration-300`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
