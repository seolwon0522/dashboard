// 요약 통계 카드 컴포넌트
// 숫자 하나와 라벨을 받아 강조 표시

interface Props {
  label: string
  value: number
  // 강조 색상: blue(기본), green, red, yellow
  color?: 'blue' | 'green' | 'red' | 'yellow'
  // true면 배경색으로 경고 강조 (기한 초과 > 0일 때 사용)
  highlight?: boolean
  // 보조 텍스트 (예: 처리율 85%)
  subtitle?: string
}

// 색상별 클래스 매핑
const colorMap = {
  blue:   { border: 'border-blue-400',   text: 'text-blue-600',   bg: 'bg-blue-50'   },
  green:  { border: 'border-green-400',  text: 'text-green-600',  bg: 'bg-green-50'  },
  red:    { border: 'border-red-400',    text: 'text-red-600',    bg: 'bg-red-50'    },
  yellow: { border: 'border-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50' },
}

export default function SummaryCard({ label, value, color = 'blue', highlight = false, subtitle }: Props) {
  const { border, text, bg } = colorMap[color]

  return (
    <div className={`rounded-lg shadow-sm border-l-4 ${border} p-4 ${highlight ? bg : 'bg-white'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${text}`}>{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
