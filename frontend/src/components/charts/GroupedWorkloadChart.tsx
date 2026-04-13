interface WorkloadItem {
  label: string
  open: number
  overdue: number
  stale: number
}

interface Props {
  title: string
  description: string
  items: WorkloadItem[]
}

export default function GroupedWorkloadChart({ title, description, items }: Props) {
  const visibleItems = items.slice(0, 6)
  const maxValue = Math.max(1, ...visibleItems.flatMap((item) => [item.open, item.overdue, item.stale]))

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
        </div>
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-900" />활성</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />지연</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />정체</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {visibleItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4">
            <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</div>
            <div className="mt-4 flex h-28 items-end justify-center gap-2">
              {[
                { value: item.open, color: 'bg-slate-900' },
                { value: item.overdue, color: 'bg-rose-500' },
                { value: item.stale, color: 'bg-amber-500' },
              ].map((bar, index) => {
                const height = `${Math.max(8, Math.round((bar.value / maxValue) * 100))}%`
                return <div key={`${item.label}-${index}`} className={`w-4 rounded-t-xl ${bar.color}`} style={{ height }} />
              })}
            </div>
            <div className="mt-3 grid gap-1 text-[11px] text-slate-500">
              <div>활성 {item.open}</div>
              <div>지연 {item.overdue}</div>
              <div>정체 {item.stale}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}