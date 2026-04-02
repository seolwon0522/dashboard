// 담당자별 작업현황 모달 컴포넌트
// 새 API(/api/v1/dashboard/workload/member)를 호출하여 오픈/진행중 전체 이슈 표시
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MemberIssuesResponse, WorkloadItem } from '@/types/dashboard'
import { fetchMemberIssues } from '@/lib/api'

interface Props {
  // 선택된 담당자 정보
  member: WorkloadItem
  // 현재 선택된 프로젝트 ID
  projectId?: string
  // 모달 닫기 콜백
  onClose: () => void
}

export default function MemberModal({ member, projectId, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  // API 응답 데이터
  const [data, setData] = useState<MemberIssuesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 안정적인 콜백 참조
  const handleClose = useCallback(() => onClose(), [onClose])

  // 모달 열릴 때 담당자 이슈 조회
  useEffect(() => {
    setLoading(true)
    setError(null)

    fetchMemberIssues(member.user_id, projectId)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [member.user_id, projectId])

  // ESC 키로 모달 닫기 + body 스크롤 방지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleClose])

  // 오버레이 배경 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name}의 작업 현황`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slideUp">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {member.name}의 작업 현황
            </h2>
            {/* 요약 뱃지 */}
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                오픈 {data?.total ?? member.open_issues}건
              </span>
              {(data?.overdue_count ?? member.overdue_issues) > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  기한초과 {data?.overdue_count ?? member.overdue_issues}건
                </span>
              )}
            </div>
          </div>
          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="모달 닫기"
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xl leading-none p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── 본문 ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 로딩 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              이슈 불러오는 중...
            </div>
          )}

          {/* 에러 상태 */}
          {!loading && error && (
            <div className="text-center text-red-500 text-sm py-8">
              이슈 조회 실패: {error}
            </div>
          )}

          {/* 데이터 없음 */}
          {!loading && !error && data?.issues.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              이슈가 없습니다.
            </div>
          )}

          {/* 이슈 테이블 */}
          {!loading && !error && data && data.issues.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">우선순위</th>
                  <th className="px-3 py-2 text-left">마감일</th>
                  <th className="px-3 py-2 text-right">초과일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.issues.map((issue) => (
                  <tr
                    key={issue.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      issue.is_overdue ? 'bg-red-50' : ''
                    }`}
                  >
                    {/* 제목 — Redmine 직접 링크 */}
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-xs">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        title={issue.subject}
                      >
                        <span className="text-gray-400 mr-1">#{issue.id}</span>
                        <span className="line-clamp-1">{issue.subject}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs whitespace-nowrap">
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{issue.priority ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{issue.due_date ?? '-'}</td>
                    <td className="px-3 py-2 text-right">
                      {issue.is_overdue ? (
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
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 하단 안내 ── */}
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-400 text-right rounded-b-xl">
          ※ 오픈/진행중 이슈 전체 표시 · 제목 클릭 시 Redmine으로 이동
        </div>
      </div>
    </div>
  )
}
