import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  density?: 'primary' | 'secondary' | 'compact'
}

const CONTAINER_CLASS = {
  primary: 'rounded-[24px] border border-[#e6ebf1] bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.22)]',
  secondary: 'rounded-[20px] border border-[#e6ebf1] bg-white shadow-[0_8px_24px_-24px_rgba(15,23,42,0.18)]',
  compact: 'rounded-[18px] border border-[#e6ebf1] bg-white shadow-none',
} as const

const HEADER_CLASS = {
  primary: 'flex items-start justify-between gap-3 border-b border-[#f0f4f8] px-5 py-4',
  secondary: 'flex items-start justify-between gap-3 border-b border-[#f0f4f8] px-4 py-4',
  compact: 'flex items-start justify-between gap-3 border-b border-[#f0f4f8] px-4 py-3.5',
} as const

const TITLE_CLASS = {
  primary: 'text-[17px] font-semibold tracking-tight text-[#191f28]',
  secondary: 'text-[15px] font-semibold tracking-tight text-[#191f28]',
  compact: 'text-sm font-semibold tracking-tight text-[#191f28]',
} as const

const SUBTITLE_CLASS = {
  primary: 'mt-1.5 max-w-3xl text-sm leading-6 text-[#4e5968]',
  secondary: 'mt-1.5 max-w-3xl text-sm leading-5 text-[#4e5968]',
  compact: 'mt-1 max-w-2xl text-xs leading-5 text-[#8b95a1]',
} as const

const BODY_CLASS = {
  primary: 'px-5 py-5',
  secondary: 'px-4 py-4',
  compact: 'px-4 py-4',
} as const

export default function SectionCard({
  title,
  subtitle,
  aside,
  children,
  className = '',
  bodyClassName = '',
  density = 'primary',
}: Props) {
  return (
    <section className={[
      CONTAINER_CLASS[density],
      className,
    ].join(' ')}>
      <div className={[HEADER_CLASS[density], 'flex-col sm:flex-row'].join(' ')}>
        <div className="min-w-0 flex-1">
          <h2 className={TITLE_CLASS[density]}>{title}</h2>
          {subtitle ? <p className={SUBTITLE_CLASS[density]}>{subtitle}</p> : null}
        </div>
        {aside ? <div className="w-full sm:w-auto sm:shrink-0">{aside}</div> : null}
      </div>
      <div className={[BODY_CLASS[density], bodyClassName].join(' ')}>{children}</div>
    </section>
  )
}
