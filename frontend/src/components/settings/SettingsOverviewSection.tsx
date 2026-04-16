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
            <div className="text-sm font-semibold text-slate-950">운영 기준 설정</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              경고 기준과 점수 계산 방식을 조정하는 화면입니다. 먼저 프리셋으로 전체 톤을 맞추고,
              필요한 값만 세부 조정하는 흐름이 가장 안정적입니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">빠른 프리셋 적용</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">즉시 결과 반영</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">필요한 값만 조정</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">먼저 볼 항목</div>
            <div className="mt-2 text-base font-semibold text-slate-950">정체, 임박 일정, 담당자 과부하</div>
            <div className="mt-1 text-sm text-slate-500">대부분의 운영 변화는 이 세 기준에서 먼저 체감됩니다.</div>
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
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  지금 적용된 기준과 운영 화면에 바로 반영될 핵심 값을 한 번에 확인합니다.
                </p>
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
            <p className="mt-2 text-sm leading-5 text-slate-600">
              상태 점수, 우선 확인 큐, 담당자 작업량, 이슈 탐색 기준이 함께 다시 계산됩니다.
            </p>
          </section>

          <section className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 shadow-sm shadow-amber-100/30">
            <div className="text-sm font-semibold text-amber-900">조정 팁</div>
            <p className="mt-2 text-sm leading-5 text-amber-900">
              경고가 너무 늦게 보이면 기준을 낮추고, 대부분의 작업이 계속 경고로 보이면 기준을 높이는 편이 좋습니다.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
