import type { ReactNode } from 'react'

import type { DashboardTone } from '@/lib/dashboard'

interface Props {
  tone?: DashboardTone
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

const TONE_CLASS: Record<DashboardTone, string> = {
  neutral: 'bg-[#f2f4f6] text-[#4e5968] border-[#e5e8eb]',
  info: 'bg-[#eef6ff] text-[#1f6feb] border-[#d6e8ff]',
  warning: 'bg-[#fff6e5] text-[#b86200] border-[#ffe2b8]',
  danger: 'bg-[#fff0f0] text-[#d64545] border-[#ffd9d9]',
  success: 'bg-[#edf9f2] text-[#0f8a4b] border-[#d4f0df]',
}

const SIZE_CLASS = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3 py-1.5 text-xs',
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