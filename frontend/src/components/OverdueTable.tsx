// 기한 초과 이슈 테이블 컴포넌트
import type { OverdueIssue } from '@/types/dashboard'

interface Props {
  issues: OverdueIssue[]
}

export default function OverdueTable({ issues }: Props) {
  // 데이터 없을 때 빈 상태 표시
  if (issues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-400 text-sm">
        기한 초과 이슈가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">제목</th>
              <th className="px-4 py-3 text-left">담당자</th>
              <th className="px-4 py-3 text-left">마감일</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">우선순위</th>
              {/* 초과 일수: 숫자가 클수록 빨간색 */}
              <th className="px-4 py-3 text-right">초과일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">#{issue.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title={issue.subject}
                  >
                    {issue.subject}
                  </a>
                </td>
                <td className="px-4 py-3 text-gray-600">{issue.assigned_to ?? '미할당'}</td>
                <td className="px-4 py-3 text-gray-600">{issue.due_date}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                    {issue.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{issue.priority ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  {/* 7일 초과: 빨간색, 3~7일: 주황색, 3일 미만: 노란색 */}
                  <span
                    className={`font-semibold ${
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
    </div>
  )
}
