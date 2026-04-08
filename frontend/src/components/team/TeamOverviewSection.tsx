'use client'

import { useEffect, useMemo, useState } from 'react'

import AssigneeInsightsPanel from '@/components/AssigneeInsightsPanel'
import IssueDetailDrawer from '@/components/IssueDetailDrawer'
import TeamCapacityPanel from '@/components/TeamCapacityPanel'
import type { DashboardModel, DashboardThresholdSettings } from '@/lib/dashboard'
import type { AssigneeFilter } from '@/types/dashboard'

interface Props {
  model: DashboardModel
  settings: DashboardThresholdSettings
}

export default function TeamOverviewSection({ model, settings }: Props) {
  const [activeAssignee, setActiveAssignee] = useState<AssigneeFilter | null>(null)
  const [selectedInsightKey, setSelectedInsightKey] = useState<string | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)

  const visibleInsights = useMemo(() => {
    if (!activeAssignee) return model.insights
    return model.insights.filter((insight) => insight.assignee.id === activeAssignee.id)
  }, [activeAssignee, model.insights])

  useEffect(() => {
    if (!selectedInsightKey) return

    const exists = visibleInsights.some((insight) => insight.key === selectedInsightKey)
    if (!exists) {
      setSelectedInsightKey(null)
    }
  }, [selectedInsightKey, visibleInsights])

  const stretchedCount = model.capacity.filter((member) => member.band === 'stretched').length
  const watchCount = model.capacity.filter((member) => member.band === 'watch').length
  const selectedMember = activeAssignee
    ? model.capacity.find((member) => member.assignee.id === activeAssignee.id) ?? null
    : null

  function handleSelectAssignee(assignee: AssigneeFilter | null) {
    setActiveAssignee(assignee)
    setSelectedInsightKey(assignee && assignee.id !== null ? String(assignee.id) : null)
  }

  function handleSelectInsightKey(nextKey: string | null) {
    setSelectedInsightKey(nextKey)

    if (!nextKey) {
      setActiveAssignee(null)
      return
    }

    const insight = model.insights.find((item) => item.key === nextKey) ?? null
    setActiveAssignee(insight ? insight.assignee : null)
  }

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">팀 작업 패턴</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">부하가 몰리는 담당자와 점검이 필요한 작업 흐름을 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">과부하 {stretchedCount}명</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">주의 {watchCount}명</span>
            {activeAssignee ? (
              <button
                type="button"
                onClick={() => setActiveAssignee(null)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                담당자 선택 해제
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <TeamCapacityPanel
          members={model.capacity}
          settings={settings}
          activeAssignee={activeAssignee}
          onSelectAssignee={handleSelectAssignee}
        />

        <div className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/40">
            <div className="text-sm font-semibold text-slate-950">선택한 담당자 요약</div>
            {selectedMember ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">담당자</div>
                  <div className="mt-2 text-base font-semibold text-slate-950">{selectedMember.assignee.name}</div>
                  <div className="mt-2 text-sm text-slate-500">활성 {selectedMember.openCount}건 · 진행 {selectedMember.inProgressCount}건</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">점검 포인트</div>
                  <div className="mt-2 text-base font-semibold text-slate-950">지연 {selectedMember.overdueCount} · 정체 {selectedMember.staleCount}</div>
                  <div className="mt-2 text-sm text-slate-500">최근 갱신 유지율 {Math.round(selectedMember.recentUpdateRate * 100)}%</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                좌측에서 담당자를 선택하면 현재 작업 흐름과 근거 이슈를 바로 확인할 수 있습니다.
              </div>
            )}
          </section>

          {activeAssignee?.id !== null ? (
            <AssigneeInsightsPanel
              insights={visibleInsights}
              settings={settings}
              mode="focused"
              selectedKey={selectedInsightKey}
              onSelectKey={handleSelectInsightKey}
              onSelectIssue={setSelectedIssueId}
            />
          ) : (
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/40">
              <div className="text-sm font-semibold text-slate-950">작업 패턴 보기</div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                선택한 담당자가 없으면 아래에서 팀 전체 패턴을 둘러보고, 필요한 항목을 선택해 자세히 볼 수 있습니다.
              </div>
            </section>
          )}
        </div>
      </div>

      {!activeAssignee ? (
        <AssigneeInsightsPanel
          insights={model.insights}
          settings={settings}
          mode="condensed"
          selectedKey={selectedInsightKey}
          onSelectKey={handleSelectInsightKey}
          onSelectIssue={setSelectedIssueId}
        />
      ) : null}

      <IssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onSelectIssue={setSelectedIssueId}
      />
    </>
  )
}