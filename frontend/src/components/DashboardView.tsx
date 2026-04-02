'use client'

// 대시보드 본체 컴포넌트
// 기존 page.tsx에서 대시보드 렌더링 로직만 분리
// projectId를 props로 받아 summary / overdue / workload 데이터를 조회·표시
import { useEffect, useState } from 'react'

import OverdueTable from '@/components/OverdueTable'
import SummaryCard from '@/components/SummaryCard'
import WorkloadBar from '@/components/WorkloadBar'
import MemberModal from '@/components/MemberModal'
import {
  fetchOverdueIssues,
  fetchSummary,
  fetchWorkload,
} from '@/lib/api'
import type {
  DashboardSummary,
  OverdueIssuesResponse,
  WorkloadItem,
  WorkloadResponse,
} from '@/types/dashboard'

interface Props {
  projectId: string
}

export default function DashboardView({ projectId }: Props) {
  // 대시보드 데이터
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [overdue, setOverdue] = useState<OverdueIssuesResponse | null>(null)
  const [workload, setWorkload] = useState<WorkloadResponse | null>(null)
  // 로딩 / 에러 상태
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 담당자별 모달 상태
  const [selectedMember, setSelectedMember] = useState<WorkloadItem | null>(null)

  // projectId가 바뀔 때마다 대시보드 데이터 전체 재조회
  useEffect(() => {
    setLoading(true)
    setError(null)

    // 3개 API를 병렬로 호출
    Promise.all([
      fetchSummary(projectId),
      fetchOverdueIssues(projectId),
      fetchWorkload(projectId),
    ])
      .then(([summaryData, overdueData, workloadData]) => {
        setSummary(summaryData)
        setOverdue(overdueData)
        setWorkload(workloadData)
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [projectId])

  // ── 로딩 상태 ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        데이터 불러오는 중...
      </div>
    )
  }

  // ── 에러 상태 ──
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
        <strong>오류 발생:</strong> {error}
        <p className="mt-1 text-red-500">백엔드 서버(포트 8000)가 실행 중인지 확인하세요.</p>
      </div>
    )
  }

  if (!summary) return null

  return (
    <>
      {/* 요약 카드 4개 */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <SummaryCard label="전체 이슈" value={summary.total} color="blue" />
        <SummaryCard
          label="Open"
          value={summary.by_status_group['open'] ?? 0}
          color="yellow"
        />
        <SummaryCard
          label="Closed"
          value={summary.by_status_group['closed'] ?? 0}
          color="green"
        />
        <SummaryCard label="기한 초과" value={summary.overdue} color="red" />
      </section>

      {/* 하단: overdue 테이블 + 워크로드 바 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 기한 초과 이슈 테이블 (좌측 2/3) */}
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            기한 초과 이슈 ({overdue?.count ?? 0}건)
          </h2>
          <OverdueTable issues={overdue?.issues ?? []} />
        </section>

        {/* 담당자별 워크로드 (우측 1/3) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            담당자별 워크로드
          </h2>
          <WorkloadBar
            workload={workload?.workload ?? []}
            onSelect={(userId) => {
              const member = workload?.workload.find((w) => w.user_id === userId)
              if (member) setSelectedMember(member)
            }}
          />
        </section>
      </div>

      {/* 캐시 타임스탬프 */}
      <p className="mt-6 text-xs text-gray-400 text-right">
        기준 시각: {new Date(summary.cached_at).toLocaleString('ko-KR')}
      </p>

      {/* 담당자별 작업현황 모달 */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          projectId={projectId}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  )
}
