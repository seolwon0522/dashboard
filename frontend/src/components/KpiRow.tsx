'use client'

import type { DashboardFilter } from '@/types/dashboard'
import type { KpiCardModel } from '@/lib/dashboard'

interface Props {
  kpis: KpiCardModel[]
  filter: DashboardFilter
  onSelect: (config: { statusGroup?: string | null; preset?: DashboardFilter['preset'] }) => void
}

const TONE_STYLES = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export default function KpiRow({ kpis, filter, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const isActive = (kpi.statusGroup && filter.statusGroup === kpi.statusGroup)
          || (kpi.preset && filter.preset === kpi.preset)

        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onSelect({ statusGroup: kpi.statusGroup ?? null, preset: kpi.preset ?? null })}
            className={[
              'rounded-xl border px-4 py-3 text-left transition-all',
              TONE_STYLES[kpi.tone],
              isActive ? 'ring-2 ring-slate-900/10 shadow-md shadow-slate-200/70' : 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {kpi.label}
              </span>
              {isActive ? <span className="text-[11px] font-medium text-slate-500">적용됨</span> : null}
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{kpi.value}</div>
            <p className="mt-1 text-xs text-slate-600">{kpi.note}</p>
          </button>
        )
      })}
    </div>
  )
}
