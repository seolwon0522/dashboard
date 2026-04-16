import Link from 'next/link'

import Badge from '@/components/Badge'
import EvidenceDisclosure from '@/components/EvidenceDisclosure'
import ScopeBadge from '@/components/ScopeBadge'
import TrendIndicator from '@/components/TrendIndicator'
import WorkflowActions from '@/components/WorkflowActions'
import type { AssigneeTendencyInsight, CapacityMemberModel } from '@/lib/dashboard'

interface Props {
  projectId: string
  member: CapacityMemberModel
  insight: AssigneeTendencyInsight | null
  windowLabel: string
}

function getBandTone(band: CapacityMemberModel['band']) {
  if (band === 'stretched') return 'danger' as const
  if (band === 'watch') return 'warning' as const
  return 'success' as const
}

function buildActivityScore(member: CapacityMemberModel, insight: AssigneeTendencyInsight | null) {
  const onTimeScore = Math.round((insight?.onTimeRate ?? 0.6) * 35)
  const updateScore = Math.round(member.recentUpdateRate * 35)
  const stalePenalty = Math.round((insight?.staleShare ?? 0) * 30)
  return Math.max(0, Math.min(100, onTimeScore + updateScore + 30 - stalePenalty))
}

function getBehaviorTone(behaviorType: AssigneeTendencyInsight['behaviorType']) {
  if (behaviorType === 'fast_unstable') return 'warning' as const
  if (behaviorType === 'high_activity_low_completion') return 'danger' as const
  if (behaviorType === 'slow_stable') return 'info' as const
  return 'success' as const
}

function getConfidenceTone(level: AssigneeTendencyInsight['confidenceLevel']) {
  if (level === 'high') return 'success' as const
  if (level === 'medium') return 'warning' as const
  return 'neutral' as const
}

function getConfidenceLabel(level: AssigneeTendencyInsight['confidenceLevel']) {
  if (level === 'high') return '신뢰도 높음'
  if (level === 'medium') return '신뢰도 보통'
  return '신뢰도 낮음'
}

function getConfidenceSurface(level: AssigneeTendencyInsight['confidenceLevel']) {
  if (level === 'high') return 'border-slate-200 bg-white'
  if (level === 'medium') return 'border-amber-200 bg-amber-50/40'
  return 'border-dashed border-slate-300 bg-slate-50/80'
}

export default function UserInsightCard({ projectId, member, insight, windowLabel }: Props) {
  const activityScore = buildActivityScore(member, insight)
  const trend = {
    direction: member.recentUpdateRate >= 0.7 ? 'up' : member.recentUpdateRate >= 0.45 ? 'flat' : 'down',
    deltaLabel: `${Math.round(member.recentUpdateRate * 100)}% 최근 업데이트`,
    comparisonLabel: member.staleCount > 0 ? `정체 ${member.staleCount}건 포함` : '정체 이슈 없음',
    tone: member.band === 'stretched' ? 'danger' : member.band === 'watch' ? 'warning' : 'success',
  } as const
  const containerClassName = insight ? getConfidenceSurface(insight.confidenceLevel) : 'border-slate-200 bg-white'
  const actionHref = `/dashboard/${encodeURIComponent(projectId)}/issues?assignee=${encodeURIComponent(String(member.assignee.id ?? 'unassigned'))}&preset=${encodeURIComponent(member.overdueCount > 0 ? 'overdue' : member.staleCount > 0 ? 'stale' : 'attention')}`
  const actionLabel = member.overdueCount > 0 ? '담당 이슈 확인' : member.staleCount > 0 ? '정체 이슈 확인' : '주의 이슈 확인'
  const summaryText = member.overdueCount > 0
    ? `지연 ${member.overdueCount}건이 누적되어 먼저 확인이 필요합니다.`
    : member.staleCount > 0
      ? `정체 ${member.staleCount}건이 남아 있어 진행 점검이 필요합니다.`
      : insight?.confidenceLevel === 'low'
        ? '표본이 적어 참고용 신호로 보는 편이 안전합니다.'
        : insight?.interpretation ?? '눈에 띄는 병목 신호는 아직 크지 않습니다.'

  return (
    <article className={[
      'flex min-h-[236px] flex-col rounded-[22px] border p-4 shadow-[0_10px_26px_-22px_rgba(15,23,42,0.2)]',
      containerClassName,
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-950">{member.assignee.name}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={getBandTone(member.band)}>
              {member.band === 'stretched' ? '과부하' : member.band === 'watch' ? '주의' : '안정'}
            </Badge>
            {insight ? <Badge tone={getBehaviorTone(insight.behaviorType)}>{insight.behaviorLabel}</Badge> : null}
            {insight ? <Badge tone={getConfidenceTone(insight.confidenceLevel)}>{getConfidenceLabel(insight.confidenceLevel)}</Badge> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">운영 점수</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{activityScore}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <ScopeBadge kind="window" label={windowLabel} />
        <ScopeBadge kind="advisory" label={insight?.confidenceLevel === 'low' ? '참고용 신호' : '후속 점검 후보'} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-slate-800">
        {insight?.behaviorSummary ?? '최근 작업 흐름을 기준으로 먼저 확인할 담당자입니다.'}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[14px] border border-white bg-white/90 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">활성</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{member.openCount}건</div>
        </div>
        <div className="rounded-[14px] border border-white bg-white/90 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">지연</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{member.overdueCount}건</div>
        </div>
        <div className="rounded-[14px] border border-white bg-white/90 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">정체</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{member.staleCount}건</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-5 text-slate-600">{summaryText}</p>

      <WorkflowActions
        className="mt-3"
        heading="확인 순서"
        items={[
          {
            label: actionLabel,
            href: actionHref,
            step: '1',
            priority: 'primary',
          },
          {
            label: '담당자 화면 보기',
            href: `/dashboard/${encodeURIComponent(projectId)}/team?assignee=${encodeURIComponent(String(member.assignee.id ?? 'unassigned'))}`,
            step: '2',
            priority: 'secondary',
          },
        ]}
      />

      {insight ? (
        <EvidenceDisclosure title="판단 근거" hint={`표본 ${insight.sampleIssueCount}건 기준`} className="mt-auto pt-3">
          <div className="mt-3 space-y-3">
            <TrendIndicator trend={trend} />
            <div className="grid gap-2 sm:grid-cols-3">
              {insight.evidence.slice(0, 3).map((item) => (
                <div key={`${member.key}-${item.label}`} className="rounded-xl border border-white bg-white px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </EvidenceDisclosure>
      ) : null}
    </article>
  )
}
