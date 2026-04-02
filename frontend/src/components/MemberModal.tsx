// 담당자별 작업현황 모달 컴포넌트
// 기존 overdue API 결과를 프론트에서 필터링하여 담당자별 이슈 표시
'use client'

import { useEffect, useRef } from 'react'
import type { OverdueIssue, WorkloadItem } from '@/types/dashboard'

// Redmine 이슈 직접 링크용 base URL
const REDMINE_URL = 'http://106.255.231.26:6080'

interface Props {
  // 선택된 담당자 정보
  member: WorkloadItem
  // 전체 기한 초과 이슈 목록 (프론트에서 필터링)
  allOverdueIssues: OverdueIssue[]
  // 모달 닫기 콜백
  onClose: () => void
}

export default function MemberModal({ member, allOverdueIssues, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 해당 담당자의 기한 초과 이슈만 필터링
  const memberOverdueIssues = allOverdueIssues.filter((issue) => {
    if (member.user_id === null) {
      // 미할당 이슈
      return issue.assigned_to === null || issue.assigned_to === '미할당'
    }
    return issue.assigned_to === member.name
  })

  // 오버레이 배경 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {member.name}
              <span className="text-sm font-normal text-gray-500 ml-2">작업 현황</span>
            </h2>
            {/* 요약 뱃지 */}
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                오픈 {member.open_issues}건
              </span>
              {member.overdue_issues > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  기한초과 {member.overdue_issues}건
                </span>
              )}
            </div>
          </div>
          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* ── 이슈 목록 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {memberOverdueIssues.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              기한 초과 이슈가 없습니다.
              {member.open_issues > 0 && (
                <p className="mt-1 text-gray-300">
                  오픈 이슈 {member.open_issues}건은 마감일 이내입니다.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left">마감일</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">우선순위</th>
                  <th className="px-3 py-2 text-right">초과일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {memberOverdueIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className={`hover:bg-gray-50 ${
                      issue.days_overdue >= 7 ? 'bg-red-50' : ''
                    }`}
                  >
                    {/* Redmine 이슈 직접 링크 */}
                    <td className="px-3 py-2">
                      <a
                        href={`${REDMINE_URL}/issues/${issue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        #{issue.id}
                      </a>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-xs truncate">
                      <a
                        href={`${REDMINE_URL}/issues/${issue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {issue.subject}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{issue.due_date}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{issue.priority ?? '-'}</td>
                    <td className="px-3 py-2 text-right">
                      {/* 7일 초과: 빨강, 3~7일: 주황, 3일 미만: 노랑 */}
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
          )}
        </div>

        {/* ── 하단 안내 ── */}
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-400 text-right rounded-b-xl">
          ※ 기한 초과 이슈만 표시됩니다 · 이슈 번호 클릭 시 Redmine으로 이동
        </div>
      </div>
    </div>
  )
}
