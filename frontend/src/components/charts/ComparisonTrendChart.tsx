interface TrendPoint {
  label: string
  primary: number
  secondary: number
}

interface Props {
  title: string
  description: string
  points: TrendPoint[]
  primaryLabel: string
  secondaryLabel: string
}

function buildPolyline(points: number[], chartHeight: number, maxValue: number, stepX: number): string {
  return points
    .map((value, index) => {
      const x = index * stepX
      const y = chartHeight - (value / maxValue) * chartHeight
      return `${x},${y}`
    })
    .join(' ')
}

export default function ComparisonTrendChart({
  title,
  description,
  points,
  primaryLabel,
  secondaryLabel,
}: Props) {
  const chartHeight = 88
  const chartWidth = 100
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.primary, point.secondary]))
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth
  const primaryPath = buildPolyline(points.map((point) => point.primary), chartHeight, maxValue, stepX)
  const secondaryPath = buildPolyline(points.map((point) => point.secondary), chartHeight, maxValue, stepX)

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
        </div>
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
            {primaryLabel}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            {secondaryLabel}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 8}`} className="h-36 w-full overflow-visible">
          {[0, 0.5, 1].map((ratio) => {
            const y = chartHeight - chartHeight * ratio
            return (
              <line
                key={ratio}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="2 3"
                strokeWidth="0.6"
              />
            )
          })}

          <polyline
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPath}
          />
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={secondaryPath}
          />

          {points.map((point, index) => {
            const x = index * stepX
            const primaryY = chartHeight - (point.primary / maxValue) * chartHeight
            const secondaryY = chartHeight - (point.secondary / maxValue) * chartHeight

            return (
              <g key={point.label}>
                <circle cx={x} cy={primaryY} r="1.9" fill="#0f172a" />
                <circle cx={x} cy={secondaryY} r="1.9" fill="#f59e0b" />
                <text x={x} y={chartHeight + 6} textAnchor="middle" fontSize="4" fill="#64748b">
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}