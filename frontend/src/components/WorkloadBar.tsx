// 담당자별 워크로드 바 차트 컴포넌트
// 외부 차트 라이브러리 미사용 — Tailwind + 인라인 스타일로 구현
// 카드 래퍼는 부모(DashboardView)에서 제공
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
      <div className="px-4 py-6 text-center text-gray-400 text-sm">
        워크로드 데이터가 없습니다.
      </div>
    )
  }

  // 바 너비 계산용 최대 open 이슈 수
  const maxOpen = Math.max(...workload.map((w) => w.open_issues), 1)

  return (
    <div className="divide-y divide-gray-100">
      {workload.map((item) => (
        <div
          key={item.user_id ?? 'unassigned'}
          role="button"
          tabIndex={0}
          onClick={() => onSelect?.(item.user_id, item.name)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect?.(item.user_id, item.name)
            }
          }}
          className="flex items-center gap-2 py-2 px-3 cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-100"
        >
          {/* 담당자 이름 */}
          <span className="w-16 shrink-0 text-xs font-medium text-gray-700 truncate">
            {item.name}
          </span>

          {/* 바 트랙 — overdue가 있으면 빨간색 구간 포함 */}
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {item.overdue_issues > 0 && (
              <div
                className="h-full bg-red-400 transition-all duration-300"
                style={{ width: `${(item.overdue_issues / maxOpen) * 100}%` }}
              />
            )}
            <div
              className="h-full bg-blue-400 transition-all duration-300"
              style={{ width: `${((item.open_issues - item.overdue_issues) / maxOpen) * 100}%` }}
            />
          </div>

          {/* 숫자 */}
          <span className="shrink-0 text-xs tabular-nums text-gray-500">
            {item.open_issues}
          </span>
          {item.overdue_issues > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-red-500 font-medium -ml-1">
              ({item.overdue_issues})
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
