// 담당자별 워크로드 바 차트 컴포넌트
// 외부 차트 라이브러리 미사용 — Tailwind + 인라인 스타일로 구현
import type { WorkloadItem } from '@/types/dashboard'

interface Props {
  workload: WorkloadItem[]
  // 담당자 클릭 시 호출되는 콜백 (모달 열기용)
  onSelect?: (userId: number | null, userName: string) => void
}

export default function WorkloadBar({ workload, onSelect }: Props) {
  // 데이터 없을 때
  if (workload.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-400 text-sm">
        워크로드 데이터가 없습니다.
      </div>
    )
  }

  // 바 너비 계산용 최대 open 이슈 수
  const maxOpen = Math.max(...workload.map((w) => w.open_issues), 1)

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
      {workload.map((item) => (
        <div key={item.user_id ?? 'unassigned'}>
          {/* 담당자 이름 + 숫자 */}
          <div className="flex justify-between text-sm mb-1">
            <button
              type="button"
              onClick={() => onSelect?.(item.user_id, item.name)}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
            >
              {item.name}
            </button>
            <span className="text-gray-500 text-xs">
              open {item.open_issues}
              {item.overdue_issues > 0 && (
                <span className="ml-1 text-red-500">/ 초과 {item.overdue_issues}</span>
              )}
            </span>
          </div>

          {/* 바 트랙 */}
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            {/* open 이슈 바 (파란색) */}
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${(item.open_issues / maxOpen) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
