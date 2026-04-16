import type { DashboardTone } from '@/lib/dashboard'

interface BarItem {
  label: string
  count: number
  note?: string
  tone?: DashboardTone
}

interface Props {
  title: string
  description: string
  items: BarItem[]
}

function getBarClass(tone: DashboardTone | undefined) {
  if (tone === 'danger') return 'bg-rose-500'
  if (tone === 'warning') return 'bg-amber-500'
  if (tone === 'success') return 'bg-emerald-500'
  if (tone === 'info') return 'bg-sky-500'
  return 'bg-slate-900'
}

export default function HorizontalBarChart({ title, description, items }: Props) {
  const maxValue = Math.max(1, ...items.map((item) => item.count))

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/20">
      <div>
        <div className="text-sm font-semibold text-slate-950">{title}</div>
        <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const width = `${Math.max(8, Math.round((item.count / maxValue) * 100))}%`
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="font-medium text-slate-800">{item.label}</div>
                <div className="text-xs font-semibold text-slate-500">{item.count}</div>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${getBarClass(item.tone)}`} style={{ width }} />
              </div>
              {item.note ? <div className="mt-1 text-xs text-slate-500">{item.note}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}