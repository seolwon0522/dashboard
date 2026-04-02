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

  const overdueCount = overdue?.count ?? 0
  const closedCount = summary.by_status_group['closed'] ?? 0
  // 처리율: Closed / 전체 비율
  const completionRate = summary.total > 0
    ? Math.round((closedCount / summary.total) * 100)
    : 0

  // 담당자 클릭 핸들러 (모달 열기)
  const handleMemberSelect = (userId: number | null) => {
    const member = workload?.workload.find((w) => w.user_id === userId)
    if (member) setSelectedMember(member)
  }

  // 이슈 상태 분포 — 비율 바 + 범례 표시용 데이터
  const statusGroups = [
    { key: 'open',        label: 'Open',   count: summary.by_status_group['open'] ?? 0,        color: 'bg-yellow-400' },
    { key: 'in_progress', label: '진행 중', count: summary.by_status_group['in_progress'] ?? 0, color: 'bg-blue-400'   },
    { key: 'closed',      label: 'Closed', count: closedCount,                                  color: 'bg-green-400'  },
  ]
  const totalForBar = statusGroups.reduce((sum, g) => sum + g.count, 0) || 1

  return (
    <>
      {/* ── 보조 정보: 전체 이슈 수 + 기준 시각 ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          전체 이슈{' '}
          <span className="font-semibold text-gray-700">
            {summary.total.toLocaleString()}
          </span>
          건
        </p>
        <p className="text-xs text-gray-400">
          기준 시각: {new Date(summary.cached_at).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* ── KPI 카드: Open · 진행 중 · 기한 초과 · Closed ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <SummaryCard
          label="Open"
          value={summary.by_status_group['open'] ?? 0}
          color="yellow"
        />
        <SummaryCard
          label="진행 중"
          value={summary.by_status_group['in_progress'] ?? 0}
          color="blue"
        />
        <SummaryCard
          label="기한 초과"
          value={summary.overdue}
          color="red"
          highlight={summary.overdue > 0}
        />
        <SummaryCard
          label="Closed"
          value={closedCount}
          color="green"
          subtitle={`처리율 ${completionRate}%`}
        />
      </section>

      {/* ── 메인 콘텐츠: 좌측 사이드(1/3) + 우측 메인(2/3) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── 좌측 패널: 워크로드 + 상태 분포 ── */}
        <div className="space-y-5">
          {/* 담당자별 워크로드 */}
          <section className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h2 className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              담당자별 워크로드
            </h2>
            <WorkloadBar
              workload={workload?.workload ?? []}
              onSelect={handleMemberSelect}
            />
          </section>

          {/* 이슈 상태 분포 — by_status_group 데이터로 비율 시각화 */}
          <section className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              이슈 상태 분포
            </h2>
            {/* 비율 스택 바 (순수 Tailwind) */}
            <div className="h-3 flex rounded-full overflow-hidden bg-gray-100">
              {statusGroups.map(
                (g) =>
                  g.count > 0 && (
                    <div
                      key={g.key}
                      className={`${g.color} transition-all duration-300`}
                      style={{ width: `${(g.count / totalForBar) * 100}%` }}
                      title={`${g.label}: ${g.count}건 (${Math.round((g.count / totalForBar) * 100)}%)`}
                    />
                  ),
              )}
            </div>
            {/* 범례 */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              {statusGroups.map((g) => (
                <div key={g.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`w-2 h-2 rounded-full ${g.color}`} />
                  <span>
                    {g.label}{' '}
                    <span className="font-medium text-gray-800">{g.count}</span>
                    <span className="text-gray-400 ml-0.5">
                      ({Math.round((g.count / totalForBar) * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── 우측 패널: 기한 초과 이슈 ── */}
        <section className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              기한 초과 이슈
            </h2>
            {overdueCount > 0 ? (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {overdueCount}건
              </span>
            ) : (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                0건
              </span>
            )}
          </div>
          {/* 테이블 또는 빈 상태 */}
          {overdueCount > 0 ? (
            <OverdueTable issues={overdue?.issues ?? []} />
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-green-600">
              <span>✅</span>
              <span>기한 초과 이슈가 없습니다</span>
            </div>
          )}
        </section>
      </div>

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
