// 기한 초과 이슈 테이블 컴포넌트
// 카드 래퍼 및 빈 상태는 부모(DashboardView)에서 처리
import type { OverdueIssue } from '@/types/dashboard'

interface Props {
  issues: OverdueIssue[]
}

export default function OverdueTable({ issues }: Props) {
  // 빈 상태는 부모에서 처리
  if (issues.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            {/* ID를 제목에 병합하여 컬럼 수 축소 */}
            <th className="px-3 py-2.5 text-left">제목</th>
            <th className="px-3 py-2.5 text-left">담당자</th>
            <th className="px-3 py-2.5 text-left">마감일</th>
            <th className="px-3 py-2.5 text-left">상태</th>
            <th className="px-3 py-2.5 text-right">초과일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-gray-50">
              {/* 제목 — ID를 인라인 포함 */}
              <td className="px-3 py-2.5 font-medium text-gray-800 max-w-xs">
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  title={issue.subject}
                >
                  <span className="text-gray-400 text-xs mr-1">#{issue.id}</span>
                  <span className="line-clamp-1">{issue.subject}</span>
                </a>
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                {issue.assigned_to ?? '미할당'}
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{issue.due_date}</td>
              <td className="px-3 py-2.5">
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs whitespace-nowrap">
                  {issue.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                {/* 7일 초과: 빨간색, 3~7일: 주황색, 3일 미만: 노란색 */}
                <span
                  className={`font-semibold whitespace-nowrap ${
                    issue.days_overdue >= 7
                      ? 'text-red-600'
                      : issue.days_overdue >= 3
                      ? 'text-orange-500'
                      : 'text-yellow-500'
                  }`}
                >
                  +{issue.days_overdue}일
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
