// 활성 필터 칩 표시 + 제거 컴포넌트
import type { DashboardFilter } from '@/types/dashboard'

interface Props {
  filter: DashboardFilter
  onClear: (key: keyof DashboardFilter) => void
  onClearAll: () => void
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
}

export default function FilterChips({ filter, onClear, onClearAll }: Props) {
  const hasAny = filter.statusGroup !== null || filter.assignee !== null || filter.onlyOverdue
  if (!hasAny) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs text-gray-400 font-medium shrink-0">Filters:</span>

      {filter.statusGroup && (
        <Chip
          label={`Status: ${STATUS_LABELS[filter.statusGroup] ?? filter.statusGroup}`}
          onRemove={() => onClear('statusGroup')}
        />
      )}

      {filter.assignee && (
        <Chip
          label={`Assignee: ${filter.assignee.name}`}
          onRemove={() => onClear('assignee')}
        />
      )}

      {filter.onlyOverdue && (
        <Chip label="Overdue only" onRemove={() => onClear('onlyOverdue')} color="red" />
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-400 hover:text-gray-600 underline ml-1 shrink-0"
      >
        Clear all
      </button>
    </div>
  )
}

function Chip({
  label,
  onRemove,
  color = 'blue',
}: {
  label: string
  onRemove: () => void
  color?: 'blue' | 'red'
}) {
  const cls =
    color === 'red'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-blue-50 text-blue-700 border-blue-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:opacity-70 focus:outline-none leading-none"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  )
}
