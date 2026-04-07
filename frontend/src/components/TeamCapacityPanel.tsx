'use client'

import Badge from '@/components/Badge'
import SectionCard from '@/components/SectionCard'
import type { CapacityMemberModel } from '@/lib/dashboard'
import type { AssigneeFilter } from '@/types/dashboard'

interface Props {
  members: CapacityMemberModel[]
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

export default function TeamCapacityPanel({ members, activeAssignee, onSelectAssignee }: Props) {
  return (
    <SectionCard
      title="팀 작업 여력"
      subtitle="담당자별 과부하 신호, 임박 일정, 최근 완료를 한 번에 볼 수 있도록 압축했습니다."
      bodyClassName="p-0"
    >
      {members.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-400">이 프로젝트에서 확인할 활성 작업이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">담당자</th>
                <th className="px-4 py-3 text-right">활성</th>
                <th className="px-4 py-3 text-left">신호</th>
                <th className="px-4 py-3 text-right">최근 완료 7일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.slice(0, 10).map((member) => {
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
                    <td className="px-4 py-3 text-right align-top text-sm font-semibold text-slate-800">
                      {member.openCount}
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
                    <td className="px-4 py-3 text-right align-top text-sm text-slate-600">
                      {member.closedRecentlyCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}