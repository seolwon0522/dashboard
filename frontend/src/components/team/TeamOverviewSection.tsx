'use client'

import { useEffect, useMemo, useState } from 'react'

import AssigneeInsightsPanel from '@/components/AssigneeInsightsPanel'
import GroupedWorkloadChart from '@/components/charts/GroupedWorkloadChart'
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
  const topRiskMembers = [...model.capacity]
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) return right.riskScore - left.riskScore
      return right.openCount - left.openCount
    })
    .slice(0, 3)

  function getMemberActionText(member: DashboardModel['capacity'][number]) {
    if (member.overdueCount > 0) return '먼저 지연 작업의 담당과 마감 일정을 다시 확인하세요.'
    if (member.staleCount > 0) return '중간 업데이트 요청이 가장 먼저 필요합니다.'
    if (member.band === 'stretched') return '업무 분산 또는 우선순위 재조정이 필요합니다.'
    if (member.dueSoonCount > 0) return '이번 주 마감 항목을 짧게 재점검하세요.'
    return '현재 흐름은 안정적입니다. 급한 변화만 확인하면 됩니다.'
  }

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
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/35">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-950">팀 관리 브리핑</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">누가 먼저 관리 개입이 필요한지, 그리고 지금 어떤 액션이 맞는지 한 번에 정리합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">과부하 {stretchedCount}명</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">주의 {watchCount}명</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">패턴 {model.insights.length}개</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">현재 선택</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{selectedMember ? selectedMember.assignee.name : '팀 전체 보기'}</div>
            <div className="mt-1 text-sm text-slate-500">
              {selectedMember
                ? getMemberActionText(selectedMember)
                : '상위 리스크 담당자를 먼저 고르거나 아래 패턴 카드에서 바로 들어가면 됩니다.'}
            </div>
            {activeAssignee ? (
              <button
                type="button"
                onClick={() => setActiveAssignee(null)}
                className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                담당자 선택 해제
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:hidden">
          {topRiskMembers.map((member) => (
            <button
              key={`mobile-quick-${member.key}`}
              type="button"
              onClick={() => handleSelectAssignee(member.assignee)}
              className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-950">{member.assignee.name}</div>
                <span className="text-xs font-semibold text-slate-500">빠른 개입</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">활성 {member.openCount}건 · 지연 {member.overdueCount}건 · 정체 {member.staleCount}건</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">{getMemberActionText(member)}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 xl:order-1">
          <TeamCapacityPanel
            members={model.capacity}
            settings={settings}
            activeAssignee={activeAssignee}
            onSelectAssignee={handleSelectAssignee}
          />
        </div>

        <div className="order-1 space-y-5 xl:order-2">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/35">
            <div className="text-sm font-semibold text-slate-950">{selectedMember ? '선택한 담당자 요약' : '팀 전체 우선 확인'}</div>
            {selectedMember ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
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

                <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.12em] text-amber-700">권장 관리 액션</div>
                  <div className="mt-2 text-sm leading-6 text-amber-900">{getMemberActionText(selectedMember)}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">과부하</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{stretchedCount}</div>
                    <div className="mt-2 text-sm text-slate-500">즉시 분산이 필요한 담당자</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">주의</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{watchCount}</div>
                    <div className="mt-2 text-sm text-slate-500">추가 확인이 필요한 담당자</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">패턴 수</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">{model.insights.length}</div>
                    <div className="mt-2 text-sm text-slate-500">아래에서 바로 열 수 있는 인사이트</div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">먼저 개입할 담당자</div>
                  <div className="mt-3 space-y-2">
                    {topRiskMembers.map((member) => (
                      <button
                        key={member.key}
                        type="button"
                        onClick={() => handleSelectAssignee(member.assignee)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white bg-white px-3 py-3 text-left transition-colors hover:border-slate-300"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{member.assignee.name}</div>
                          <div className="mt-1 text-xs text-slate-500">활성 {member.openCount}건 · 지연 {member.overdueCount}건 · 정체 {member.staleCount}건</div>
                          <div className="mt-2 text-xs leading-5 text-slate-600">{getMemberActionText(member)}</div>
                        </div>
                        <div className="text-xs font-semibold text-slate-500">선택</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <GroupedWorkloadChart
            title="담당자별 작업량 비교"
            description="상위 담당자 기준으로 활성, 지연, 정체 작업 수를 함께 비교합니다."
            items={[...model.capacity]
              .sort((left, right) => right.openCount - left.openCount)
              .slice(0, 6)
              .map((member) => ({
                label: member.assignee.name,
                open: member.openCount,
                overdue: member.overdueCount,
                stale: member.staleCount,
              }))}
          />

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
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/35">
              <div className="text-sm font-semibold text-slate-950">다음 단계</div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                먼저 상위 리스크 담당자를 선택하거나, 아래 팀 전체 패턴 목록에서 항목을 골라 근거 이슈까지 이어서 확인할 수 있습니다.
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
        settings={settings}
        onClose={() => setSelectedIssueId(null)}
        onSelectIssue={setSelectedIssueId}
      />
    </>
  )
}