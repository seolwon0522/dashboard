// 활성 필터 칩 표시 + 제거 컴포넌트
import type { DashboardFilter } from '@/types/dashboard'
import { ISSUE_PRESET_LABEL, STATUS_GROUP_LABEL } from '@/lib/labels'

interface Props {
  filter: DashboardFilter
  onClear: (key: keyof DashboardFilter) => void
  onClearAll: () => void
}

export default function FilterChips({ filter, onClear, onClearAll }: Props) {
  const hasAny = filter.statusGroup !== null || filter.assignee !== null || filter.preset !== null
  if (!hasAny) return null

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">적용 필터</span>

      {filter.statusGroup && (
        <Chip
          label={`상태: ${STATUS_GROUP_LABEL[filter.statusGroup] ?? filter.statusGroup}`}
          onRemove={() => onClear('statusGroup')}
        />
      )}

      {filter.assignee && (
        <Chip
          label={`담당자: ${filter.assignee.name}`}
          onRemove={() => onClear('assignee')}
        />
      )}

      {filter.preset && (
        <Chip
          label={`큐: ${ISSUE_PRESET_LABEL[filter.preset] ?? filter.preset}`}
          onRemove={() => onClear('preset')}
          color="red"
        />
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 shrink-0 rounded-full px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        전체 해제
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
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 leading-none text-current transition-opacity hover:opacity-70 focus:outline-none"
        aria-label={`${label} 필터 제거`}
      >
        ×
      </button>
    </span>
  )
}
