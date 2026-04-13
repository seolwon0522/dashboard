'use client'

import ThresholdSettingsForm, { type NumericSettingKey } from '@/components/settings/ThresholdSettingsForm'
import { getPresetLabel, type DashboardScoreWeights, type DashboardThresholdSettings, type ThresholdPresetMode } from '@/lib/dashboard'

interface Props {
  settings: DashboardThresholdSettings
  onReset: () => void
  onApplyPreset: (mode: Exclude<ThresholdPresetMode, 'custom'>) => void
  onChangeSetting: (key: NumericSettingKey, value: number) => void
  onChangeWeight: (key: keyof DashboardScoreWeights, value: number) => void
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
    </div>
  )
}

export default function SettingsOverviewSection({
  settings,
  onReset,
  onApplyPreset,
  onChangeSetting,
  onChangeWeight,
}: Props) {
  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/40">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-sm font-semibold text-slate-950">설정</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">먼저 프리셋으로 전체 성향을 정하고, 화면 신호가 실제 운영 감각과 다를 때만 세부 기준을 조정하는 흐름으로 구성했습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">브라우저 저장</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">즉시 재계산</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">한 번에 하나씩 조정</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">먼저 볼 항목</div>
            <div className="mt-2 text-base font-semibold text-slate-950">정체, 임박 일정, 과부하</div>
            <div className="mt-1 text-sm text-slate-500">대부분의 화면 변화는 이 세 기준에서 먼저 생깁니다.</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/40">
          <ThresholdSettingsForm
            settings={settings}
            onReset={onReset}
            onApplyPreset={onApplyPreset}
            onChangeSetting={onChangeSetting}
            onChangeWeight={onChangeWeight}
          />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/35">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">현재 기준 요약</div>
                <p className="mt-1 text-sm leading-5 text-slate-600">변경 중에도 현재 적용 기준과 운영 화면에 미치는 영향을 바로 확인합니다.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {getPresetLabel(settings.presetMode)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SummaryMetric label="정체 기준" value={`${settings.staleDays}일`} />
              <SummaryMetric label="임박 일정" value={`${settings.dueSoonDays}일`} />
              <SummaryMetric label="최근 활동" value={`${settings.recentActivityDays}일`} />
              <SummaryMetric label="과부하 기준" value={`${settings.overloadThreshold}건`} />
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/20">
            <div className="text-sm font-semibold text-slate-950">영향 범위</div>
            <p className="mt-2 text-sm leading-5 text-slate-600">상태 점수, 조치 큐, 팀 작업 여력, 이슈 탐색기 신호가 함께 다시 계산됩니다.</p>
          </section>

          <section className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 shadow-sm shadow-amber-100/30">
            <div className="text-sm font-semibold text-amber-900">조정 팁</div>
            <p className="mt-2 text-sm leading-5 text-amber-900">경고가 너무 적게 잡히면 기준을 낮추고, 너무 많은 작업이 계속 경고로 보이면 기준을 높이는 방향으로 조정하세요.</p>
          </section>
        </aside>
      </div>
    </>
  )
}