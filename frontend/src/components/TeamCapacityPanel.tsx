'use client'

import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import type { CapacityMemberModel, DashboardThresholdSettings } from '@/lib/dashboard'
import type { AssigneeFilter } from '@/types/dashboard'

interface Props {
  members: CapacityMemberModel[]
  settings: DashboardThresholdSettings
  activeAssignee: AssigneeFilter | null
  onSelectAssignee: (assignee: AssigneeFilter | null) => void
}

function getBandTone(band: CapacityMemberModel['band']) {
  if (band === 'stretched') return 'danger'
  if (band === 'watch') return 'warning'
  return 'success'
}

function getBandLabel(band: CapacityMemberModel['band']) {
  if (band === 'stretched') return '과부하'
  if (band === 'watch') return '주의'
  return '안정'
}

function getRecommendedAction(member: CapacityMemberModel) {
  if (member.overdueCount > 0) {
    return '마감 재조정 또는 담당 확인'
  }

  if (member.staleCount > 0) {
    return '중간 업데이트 요청'
  }

  if (member.openCount > 0 && member.band === 'stretched') {
    return '업무 분산 검토'
  }

  if (member.dueSoonCount > 0) {
    return '이번 주 일정 점검'
  }

  return '현재 흐름 유지'
}

export default function TeamCapacityPanel({ members, settings, activeAssignee, onSelectAssignee }: Props) {
  return (
    <SectionCard
      title="팀 작업 여력"
      subtitle={`${settings.overloadThreshold}건 기준으로 과부하를 보고, 누구에게 먼저 개입할지 바로 정합니다.`}
      density="primary"
      bodyClassName="space-y-4 p-0"
    >
      {members.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-500">이 프로젝트에서는 지금 팀 여력을 흔드는 활성 작업이 거의 없습니다. 필요하면 작업 화면에서 전체 목록만 짧게 확인하면 됩니다.</div>
      ) : (
        <>
          <div className="grid gap-3 px-4 pt-4 md:hidden">
            {members.slice(0, 8).map((member) => {
              const isActive = activeAssignee?.id === member.assignee.id

              return (
                <button
                  key={member.key}
                  type="button"
                  onClick={() => onSelectAssignee(isActive ? null : member.assignee)}
                  className={[
                    'rounded-[22px] border px-4 py-4 text-left transition-colors',
                    isActive ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{member.assignee.name}</div>
                      <div className="mt-1 text-xs text-slate-500">활성 {member.openCount}건 · IP {member.inProgressCount} · HP {member.highPriorityCount}</div>
                    </div>
                    <Badge tone={getBandTone(member.band)}>{getBandLabel(member.band)}</Badge>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className={[
                        'h-2 rounded-full',
                        member.band === 'stretched' ? 'bg-rose-500' : member.band === 'watch' ? 'bg-amber-500' : 'bg-emerald-500',
                      ].join(' ')}
                      style={{ width: `${Math.min(100, Math.round(member.utilizationRate * 100))}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={member.overdueCount > 0 ? 'danger' : 'neutral'}>지연 {member.overdueCount}</Badge>
                    <Badge tone={member.dueSoonCount > 0 ? 'warning' : 'neutral'}>임박 {member.dueSoonCount}</Badge>
                    <Badge tone={member.staleCount > 0 ? 'warning' : 'neutral'}>정체 {member.staleCount}</Badge>
                  </div>

                  <div className="mt-3 text-sm font-medium text-slate-900">{getRecommendedAction(member)}</div>
                  <div className="mt-1 text-xs text-slate-500">기준 대비 {Math.round(member.utilizationRate * 100)}% · 최근 갱신 {Math.round(member.recentUpdateRate * 100)}%</div>
                </button>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">담당자</th>
                <th className="px-4 py-3 text-left">활성 / 부하</th>
                <th className="px-4 py-3 text-left">신호</th>
                <th className="px-4 py-3 text-right">관리 포인트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.slice(0, 15).map((member) => {
                const isActive = activeAssignee?.id === member.assignee.id

                return (
                  <tr
                    key={member.key}
                    onClick={() => onSelectAssignee(isActive ? null : member.assignee)}
                    className={[
                      'cursor-pointer transition-colors hover:bg-slate-50',
                      isActive ? 'bg-slate-50' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-slate-800">{member.assignee.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            IP {member.inProgressCount} • HP {member.highPriorityCount}
                          </div>
                        </div>
                        <Badge tone={getBandTone(member.band)}>{getBandLabel(member.band)}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-semibold text-slate-800">{member.openCount}건</div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={[
                            'h-1.5 rounded-full',
                            member.band === 'stretched' ? 'bg-rose-500' : member.band === 'watch' ? 'bg-amber-500' : 'bg-emerald-500',
                          ].join(' ')}
                          style={{ width: `${Math.min(100, Math.round(member.utilizationRate * 100))}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">기준 대비 {Math.round(member.utilizationRate * 100)}%</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={member.overdueCount > 0 ? 'danger' : 'neutral'}>
                          지연 {member.overdueCount}
                        </Badge>
                        <Badge tone={member.dueSoonCount > 0 ? 'warning' : 'neutral'}>
                          임박 {member.dueSoonCount}
                        </Badge>
                        <Badge tone={member.staleCount > 0 ? 'warning' : 'neutral'}>
                          정체 {member.staleCount}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="text-sm font-semibold text-slate-800">{getRecommendedAction(member)}</div>
                      <div className="mt-1 text-xs text-slate-500">{getBandLabel(member.band)} · 최근 갱신 {Math.round(member.recentUpdateRate * 100)}%</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  )
}