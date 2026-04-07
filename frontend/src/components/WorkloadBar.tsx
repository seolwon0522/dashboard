// 담당자별 워크로드 컴팩트 테이블
// 행 클릭 → 이슈 테이블 담당자 필터링
// 상세 버튼 클릭 → MemberModal 열기
import type { AssigneeFilter, WorkloadItem } from '@/types/dashboard'

interface Props {
  workload: WorkloadItem[]
  activeAssignee: AssigneeFilter | null
  onFilter: (assignee: AssigneeFilter | null) => void
  onOpenModal: (item: WorkloadItem) => void
}

export default function WorkloadBar({ workload, activeAssignee, onFilter, onOpenModal }: Props) {
  if (workload.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-gray-400 text-sm">
        No workload data.
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 whitespace-nowrap">
              Assignee
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-400 whitespace-nowrap w-14">
              Open
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold text-gray-400 whitespace-nowrap w-20">
              Overdue
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {workload.map((item) => {
            const af: AssigneeFilter = { id: item.user_id, name: item.name }
            const isActive =
              activeAssignee !== null &&
              activeAssignee.id === item.user_id
            return (
              <tr
                key={item.user_id ?? 'unassigned'}
                role="button"
                tabIndex={0}
                onClick={() => onFilter(isActive ? null : af)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onFilter(isActive ? null : af)
                  }
                }}
                className={[
                  'cursor-pointer transition-colors hover:bg-blue-50',
                  isActive ? 'bg-blue-50' : '',
                ].join(' ')}
              >
                <td className="px-3 py-2 max-w-[150px]">
                  <span
                    className={`block truncate text-xs font-medium ${
                      isActive ? 'text-blue-700' : 'text-gray-700'
                    }`}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums font-medium text-gray-700">
                  {item.open_issues}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">
                  {item.overdue_issues > 0 ? (
                    <span className="font-semibold text-red-600">{item.overdue_issues}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    aria-label={`View ${item.name}'s issues`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenModal(item)
                    }}
                    className="text-gray-300 hover:text-blue-500 transition-colors focus:outline-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
