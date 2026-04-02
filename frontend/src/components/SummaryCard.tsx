// 요약 통계 카드 컴포넌트
// 숫자 하나와 라벨을 받아 강조 표시

interface Props {
  label: string
  value: number
  // 강조 색상: blue(기본), green, red, yellow
  color?: 'blue' | 'green' | 'red' | 'yellow'
}

// 색상별 클래스 매핑
const colorMap = {
  blue:   { border: 'border-blue-400',   text: 'text-blue-600'   },
  green:  { border: 'border-green-400',  text: 'text-green-600'  },
  red:    { border: 'border-red-400',    text: 'text-red-600'    },
  yellow: { border: 'border-yellow-400', text: 'text-yellow-600' },
}

export default function SummaryCard({ label, value, color = 'blue' }: Props) {
  const { border, text } = colorMap[color]

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${border} p-5`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${text}`}>{value.toLocaleString()}</p>
    </div>
  )
}
