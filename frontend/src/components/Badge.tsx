import type { ReactNode } from 'react'

import type { DashboardTone } from '@/lib/dashboard'

interface Props {
  tone?: DashboardTone
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

const TONE_CLASS: Record<DashboardTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-700 border-rose-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const SIZE_CLASS = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
} as const

export default function Badge({ tone = 'neutral', children, className = '', size = 'sm' }: Props) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-semibold whitespace-nowrap',
        TONE_CLASS[tone],
        SIZE_CLASS[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}