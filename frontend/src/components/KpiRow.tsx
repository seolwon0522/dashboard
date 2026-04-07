'use client'

// 컴팩트 KPI 카드 행 — 클릭 시 이슈 테이블 필터링
import type { DashboardFilter, DashboardSummary } from '@/types/dashboard'

interface Props {
  summary: DashboardSummary
  filter: DashboardFilter
  onFilterChange: (patch: Partial<DashboardFilter>) => void
}

type Color = 'gray' | 'yellow' | 'blue' | 'red' | 'green'

const colorClasses: Record<
  Color,
  { text: string; bg: string; ring: string; border: string; activeBg: string }
> = {
  gray:   { text: 'text-gray-800',   bg: 'bg-white',      ring: 'ring-gray-400',   border: 'border-gray-200',   activeBg: 'bg-gray-50'   },
  yellow: { text: 'text-yellow-700', bg: 'bg-white',      ring: 'ring-yellow-400', border: 'border-yellow-200', activeBg: 'bg-yellow-50' },
  blue:   { text: 'text-blue-700',   bg: 'bg-white',      ring: 'ring-blue-400',   border: 'border-blue-200',   activeBg: 'bg-blue-50'   },
  red:    { text: 'text-red-700',    bg: 'bg-white',      ring: 'ring-red-400',    border: 'border-red-200',    activeBg: 'bg-red-50'    },
  green:  { text: 'text-green-700',  bg: 'bg-white',      ring: 'ring-green-400',  border: 'border-green-200',  activeBg: 'bg-green-50'  },
}

interface CardProps {
  label: string
  value: string | number
  color: Color
  active?: boolean
  clickable?: boolean
  onClick?: () => void
}

function KpiCard({ label, value, color, active = false, clickable = false, onClick }: CardProps) {
  const cls = colorClasses[color]
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={[
        'flex flex-col rounded-lg border px-4 py-3 text-left w-full transition-all',
        active ? `${cls.activeBg} ${cls.border} ring-2 ${cls.ring} shadow-sm` : `${cls.bg} ${cls.border}`,
        clickable && !active ? 'hover:shadow-sm hover:ring-1 ' + cls.ring + ' cursor-pointer' : '',
        !clickable ? 'cursor-default' : '',
      ]
        .join(' ')
        .trim()}
    >
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums leading-tight ${cls.text}`}>{value}</span>
    </button>
  )
}

export default function KpiRow({ summary, filter, onFilterChange }: Props) {
  const closed = summary.by_status_group['closed'] ?? 0
  const completionRate =
    summary.total > 0 ? Math.round((closed / summary.total) * 100) : 0

  const toggle = (patch: Partial<DashboardFilter>) => {
    if ('statusGroup' in patch && filter.statusGroup === patch.statusGroup) {
      onFilterChange({ statusGroup: null })
    } else if ('onlyOverdue' in patch) {
      onFilterChange({ onlyOverdue: !filter.onlyOverdue })
    } else {
      onFilterChange(patch)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Total Issues" value={summary.total.toLocaleString()} color="gray" />
      <KpiCard
        label="Open"
        value={summary.by_status_group['open'] ?? 0}
        color="yellow"
        clickable
        active={filter.statusGroup === 'open'}
        onClick={() => toggle({ statusGroup: 'open' })}
      />
      <KpiCard
        label="In Progress"
        value={summary.by_status_group['in_progress'] ?? 0}
        color="blue"
        clickable
        active={filter.statusGroup === 'in_progress'}
        onClick={() => toggle({ statusGroup: 'in_progress' })}
      />
      <KpiCard
        label="Overdue"
        value={summary.overdue}
        color={summary.overdue > 0 ? 'red' : 'gray'}
        clickable={summary.overdue > 0}
        active={filter.onlyOverdue}
        onClick={() => toggle({ onlyOverdue: true })}
      />
      <KpiCard
        label="Completion Rate"
        value={`${completionRate}%`}
        color="green"
      />
    </div>
  )
}
