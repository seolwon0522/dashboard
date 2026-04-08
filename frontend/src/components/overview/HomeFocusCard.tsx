'use client'

import Link from 'next/link'

import Badge from '@/components/Badge'
import { getPresetLabel, type DashboardModel, type DashboardThresholdSettings } from '@/lib/dashboard'

interface Props {
  projectId: string
  model: DashboardModel
  settings: DashboardThresholdSettings
}

export default function HomeFocusCard({ projectId, model, settings }: Props) {
  const actionQueueCount = model.actions.filter((action) => action.count > 0).length

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-[0_28px_70px_-40px_rgba(15,23,42,0.95)]">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.22),_transparent_28%)] px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">오늘 운영 포커스</div>
            <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-white">{model.summary.headline}</h2>
          </div>
          <Badge tone={actionQueueCount > 0 ? 'warning' : 'success'} size="md" className="border-white/10 bg-white/5 text-white/90">
            {actionQueueCount > 0 ? `${actionQueueCount}개 즉시 조치 큐` : '긴급 큐 없음'}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">운영 기준 {getPresetLabel(settings.presetMode)}</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">정체 {settings.staleDays}일</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">임박 일정 {settings.dueSoonDays}일</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.summary.cards.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{metric.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{metric.value}</div>
              <p className="mt-2 text-xs leading-5 text-slate-300/90">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}/issues`}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
          >
            작업 화면 열기
          </Link>
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=attention`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            긴급 큐 바로 보기
          </Link>
        </div>
      </div>
    </section>
  )
}