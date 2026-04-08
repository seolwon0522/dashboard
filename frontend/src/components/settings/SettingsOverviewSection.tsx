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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Settings</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">운영 기준을 그룹별로 조정합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">로컬 저장소 기반</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">즉시 재계산</span>
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
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-md shadow-slate-200/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">현재 기준 요약</div>
                <p className="mt-1 text-sm leading-5 text-slate-600">변경 중에도 현재 적용 기준을 바로 확인합니다.</p>
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

          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/20">
            <div className="text-sm font-semibold text-slate-950">영향 범위</div>
            <p className="mt-2 text-sm leading-5 text-slate-600">상태 점수, 조치 큐, 팀 작업 여력, 이슈 탐색기 신호가 함께 다시 계산됩니다.</p>
          </section>
        </aside>
      </div>
    </>
  )
}