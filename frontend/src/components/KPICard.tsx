'use client'

import Link from 'next/link'

import EvidenceDisclosure from '@/components/EvidenceDisclosure'
import InfoTooltip from '@/components/InfoTooltip'
import TrendIndicator from '@/components/TrendIndicator'
import type { KpiCardModel } from '@/types/dashboard-derived'

interface Props {
  projectId: string
  metric: KpiCardModel
  href?: string
  emphasis?: 'primary' | 'secondary'
  className?: string
}

const STATUS_CLASS = {
  normal: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-rose-50 text-rose-700',
} as const

function getPrimaryCtaLabel(metric: KpiCardModel) {
  if (metric.preset === 'unassigned') return '미할당 이슈 보기'
  if (metric.preset === 'overdue') return '지연 이슈 보기'
  if (metric.preset === 'attention') return '우선 확인 이슈 보기'
  if (metric.statusGroup === 'in_progress') return '진행 이슈 보기'
  if (metric.preset === 'closed_recently') return '최근 완료 이슈 보기'
  return '관련 이슈 보기'
}

function getOwnerCtaLabel(metric: KpiCardModel) {
  if (!metric.guidance.owner) return null
  if (metric.guidance.owner.id === null) return '미할당 상태 보기'
  if (metric.preset === 'overdue') return '담당자 일정 보기'
  if (metric.statusGroup === 'in_progress') return '담당자 작업량 보기'
  return '담당자 보기'
}

function PrimaryCardAction({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <Link
        href={href}
        className="inline-flex min-h-[42px] w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
      >
        {label}
      </Link>
    </div>
  )
}

function CardBody({ metric, emphasis }: { metric: KpiCardModel; emphasis: 'primary' | 'secondary' }) {
  const isSecondary = emphasis === 'secondary'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={[
              'flex items-start gap-2 font-semibold text-slate-500',
              isSecondary ? 'text-[13px] leading-4 tracking-[0.01em]' : 'text-xs tracking-[0.08em]',
            ].join(' ')}
          >
            <span>{metric.label}</span>
            <InfoTooltip content={metric.tooltip} />
          </div>

          <div className={isSecondary ? 'mt-2 flex flex-col items-start gap-2' : 'mt-2.5 flex items-end gap-2.5'}>
            <div className={isSecondary ? 'text-[30px] font-semibold tracking-tight text-slate-950' : 'text-[32px] font-semibold tracking-tight text-slate-950'}>
              {metric.value}
            </div>
            <span className={['rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_CLASS[metric.status]].join(' ')}>
              {metric.statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className={isSecondary ? 'mt-2 min-h-[64px]' : 'mt-2.5 min-h-[48px]'}>
        <p className={isSecondary ? 'line-clamp-3 text-[15px] font-medium leading-6 text-slate-800' : 'line-clamp-2 text-sm font-medium leading-5 text-slate-800'}>
          {metric.note}
        </p>
      </div>

      <div className="mt-3">
        <TrendIndicator trend={metric.trend} />
      </div>

      <EvidenceDisclosure
        title="판단 근거"
        hint={metric.guidance.rootCause}
        className={['mt-4 border-dashed bg-slate-50/70', isSecondary ? 'px-3 py-2.5' : ''].join(' ')}
      >
        <div className="mt-3 space-y-3">
          <div className="text-sm leading-5 text-slate-600">원인: {metric.guidance.rootCause}</div>
          <div className="rounded-[16px] border border-sky-100 bg-sky-50 px-3 py-3 text-sm leading-6 text-sky-950">
            {metric.guidance.suggestedAction}
          </div>
        </div>
      </EvidenceDisclosure>
    </div>
  )
}

export default function KPICard({ projectId, metric, href, emphasis = 'secondary', className = '' }: Props) {
  const cardClassName = [
    'group flex flex-col rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)] transition',
    'min-h-[232px] p-5',
    href ? 'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_-26px_rgba(15,23,42,0.28)]' : '',
    className,
  ].join(' ')

  const ownerHref = metric.guidance.owner
    ? metric.guidance.owner.id === null
      ? `/dashboard/${encodeURIComponent(projectId)}/issues?assignee=unassigned`
      : `/dashboard/${encodeURIComponent(projectId)}/team?assignee=${encodeURIComponent(String(metric.guidance.owner.id))}`
    : null
  const ownerCtaLabel = getOwnerCtaLabel(metric)
  const primaryCtaLabel = getPrimaryCtaLabel(metric)

  if (href) {
    return (
      <div className={cardClassName}>
        <Link href={href} className="block flex-1 rounded-[16px] outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2">
          <CardBody metric={metric} emphasis={emphasis} />
        </Link>
        <PrimaryCardAction href={href} label={primaryCtaLabel} />
      </div>
    )
  }

  return (
    <div className={cardClassName}>
      <div className="flex-1">
        <CardBody metric={metric} emphasis={emphasis} />
      </div>
      {ownerHref && metric.guidance.owner && ownerCtaLabel ? (
        <PrimaryCardAction href={ownerHref} label={ownerCtaLabel} />
      ) : null}
    </div>
  )
}
