import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export default function SectionCard({
  title,
  subtitle,
  aside,
  children,
  className = '',
  bodyClassName = '',
}: Props) {
  return (
    <section className={[
      'rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40',
      className,
    ].join(' ')}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className={['px-4 py-4', bodyClassName].join(' ')}>{children}</div>
    </section>
  )
}