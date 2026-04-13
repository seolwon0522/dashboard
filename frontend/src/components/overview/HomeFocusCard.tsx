'use client'

import Link from 'next/link'

import Badge from '@/components/Badge'
import { getPresetLabel, type DashboardModel, type DashboardThresholdSettings } from '@/lib/dashboard'

interface Props {
  projectId: string
  model: DashboardModel
  settings: DashboardThresholdSettings
}

export default function HomeFocusCard({ projectId, model, settings }: Props) {
  const actionQueueCount = model.actions.filter((action) => action.count > 0).length
  const primaryAction = model.actions
    .filter((action) => action.count > 0)
    .sort((left, right) => right.count - left.count)[0] ?? null
  const secondaryActions = model.actions
    .filter((action) => action.count > 0 && action.id !== primaryAction?.id)
    .sort((left, right) => right.count - left.count)
    .slice(0, 2)

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e6ebf1] bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,0.22)]">
      <div className="px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#8b95a1]">오늘 운영 포커스</div>
            <h2 className="mt-3 max-w-3xl text-[28px] font-semibold leading-[1.28] tracking-tight text-[#191f28]">{model.summary.headline}</h2>
          </div>
          <Badge tone={actionQueueCount > 0 ? 'warning' : 'success'} size="md">
            {actionQueueCount > 0 ? `${actionQueueCount}개 즉시 조치 큐` : '긴급 큐 없음'}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7684]">
          <span className="rounded-full bg-[#f2f4f6] px-3 py-1.5">운영 기준 {getPresetLabel(settings.presetMode)}</span>
          <span className="rounded-full bg-[#f2f4f6] px-3 py-1.5">정체 {settings.staleDays}일</span>
          <span className="rounded-full bg-[#f2f4f6] px-3 py-1.5">임박 일정 {settings.dueSoonDays}일</span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[20px] border border-[#d6e8ff] bg-[#eef6ff] px-5 py-5">
            <div className="text-xs font-semibold text-[#6b7684]">오늘 먼저 볼 것</div>
            {primaryAction ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={primaryAction.tone} size="md">
                    {primaryAction.label} {primaryAction.count}건
                  </Badge>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#333d4b]">{primaryAction.description}</p>
                {secondaryActions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7684]">
                    {secondaryActions.map((action) => (
                      <span key={action.id} className="rounded-full bg-white px-3 py-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                        다음 확인: {action.label} {action.count}건
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#333d4b]">지금은 즉시 조치보다 진행 흐름 유지와 다음 병목 후보 확인이 우선입니다.</p>
            )}
          </div>

          <div className="rounded-[20px] border border-[#e6ebf1] bg-[#f9fbfd] px-5 py-5">
            <div className="text-xs font-semibold text-[#8b95a1]">운영 해석</div>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone={model.health.breakdown.tone} size="md">
                {model.health.breakdown.label}
              </Badge>
              <span className="text-sm font-semibold text-[#191f28]">상태 점수 {model.health.breakdown.score}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4e5968]">{model.health.breakdown.interpretation}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.summary.cards.map((metric) => (
            metric.preset ? (
              <Link
                key={metric.id}
                href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=${encodeURIComponent(metric.preset)}`}
                className="rounded-[18px] border border-[#e6ebf1] bg-white px-4 py-4 transition-colors hover:border-[#d6e8ff] hover:bg-[#f9fbfd]"
              >
                <div className="text-xs font-semibold text-[#8b95a1]">{metric.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#191f28]">{metric.value}</div>
                <p className="mt-2 text-xs leading-5 text-[#6b7684]">{metric.note}</p>
                <div className="mt-3 text-[11px] font-semibold text-[#3182f6]">작업 화면에서 확인</div>
              </Link>
            ) : (
              <div key={metric.id} className="rounded-[18px] border border-[#e6ebf1] bg-white px-4 py-4">
                <div className="text-xs font-semibold text-[#8b95a1]">{metric.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#191f28]">{metric.value}</div>
                <p className="mt-2 text-xs leading-5 text-[#6b7684]">{metric.note}</p>
              </div>
            )
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}/issues`}
            className="rounded-[14px] bg-[#3182f6] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2474e8]"
          >
            작업 화면 열기
          </Link>
          <Link
            href={`/dashboard/${encodeURIComponent(projectId)}/issues?preset=attention`}
            className="rounded-[14px] border border-[#d7e0ea] bg-white px-4 py-3 text-sm font-semibold text-[#4e5968] transition-colors hover:bg-[#f8fafc] hover:text-[#191f28]"
          >
            긴급 큐 바로 보기
          </Link>
        </div>
      </div>
    </section>
  )
}