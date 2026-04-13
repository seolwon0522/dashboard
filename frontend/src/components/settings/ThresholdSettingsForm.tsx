'use client'

import { useState } from 'react'

import Badge from '@/components/Badge'
import { getPresetLabel, type DashboardScoreWeights, type DashboardThresholdSettings, type ThresholdPresetMode } from '@/lib/dashboard'

export type NumericSettingKey = 'staleDays' | 'dueSoonDays' | 'recentActivityDays' | 'recentCompletionDays' | 'overloadThreshold' | 'longOverdueDays'

interface Props {
  settings: DashboardThresholdSettings
  onReset: () => void
  onApplyPreset: (mode: Exclude<ThresholdPresetMode, 'custom'>) => void
  onChangeSetting: (key: NumericSettingKey, value: number) => void
  onChangeWeight: (key: keyof DashboardScoreWeights, value: number) => void
}

const SETTING_CONTROLS: Array<{
  key: NumericSettingKey
  label: string
  description: string
  impact: string
  min: number
  max: number
}> = [
  { key: 'staleDays', label: '정체 기준', description: '이 일수 이상 업데이트가 없으면 정체로 봅니다.', impact: '값을 낮추면 정체 경고가 더 빨리 잡히고, 높이면 더 늦게 잡힙니다.', min: 3, max: 30 },
  { key: 'dueSoonDays', label: '임박 일정 기준', description: '이 일수 이내 마감이면 확인 대상으로 올립니다.', impact: '값을 높이면 더 많은 작업이 이번 주 확인 대상으로 올라옵니다.', min: 1, max: 21 },
  { key: 'recentActivityDays', label: '최근 활동 기준', description: '이 일수 이내 갱신이면 최근 활동으로 봅니다.', impact: '값을 높이면 최근 갱신으로 인정되는 범위가 넓어집니다.', min: 1, max: 21 },
  { key: 'recentCompletionDays', label: '최근 완료 기준', description: '이 일수 이내 완료를 보너스와 흐름 계산에 씁니다.', impact: '값을 높이면 최근 완료 흐름이 더 길게 반영됩니다.', min: 1, max: 30 },
  { key: 'overloadThreshold', label: '담당자 과부하 기준', description: '활성 이슈 수가 이 기준을 넘기면 부하를 경고합니다.', impact: '값을 낮추면 과부하 담당자가 더 빨리 잡히고, 높이면 경고가 줄어듭니다.', min: 1, max: 20 },
  { key: 'longOverdueDays', label: '장기 지연 기준', description: '장기 지연 추가 패널티를 줄 임계값입니다.', impact: '값을 낮추면 오래 지연된 작업이 더 빨리 높은 위험으로 분류됩니다.', min: 3, max: 45 },
]

const WEIGHT_CONTROLS: Array<{
  key: keyof DashboardScoreWeights
  label: string
}> = [
  { key: 'overduePenalty', label: '기한 초과 건당 감점' },
  { key: 'longOverduePenalty', label: '장기 지연 추가 감점' },
  { key: 'stalePenalty', label: '정체 건당 감점' },
  { key: 'unassignedPenalty', label: '미할당 건당 감점' },
  { key: 'dueSoonPenalty', label: '임박 일정 건당 감점' },
  { key: 'recentCompletionBonus', label: '최근 완료 건당 보너스' },
  { key: 'flowBalanceWeight', label: '유입-완료 차이 가중치' },
]

const SETTING_GROUPS: Array<{
  title: string
  description: string
  keys: NumericSettingKey[]
}> = [
  {
    title: '일정 관리',
    description: '정체와 마감 기준을 조정합니다.',
    keys: ['staleDays', 'dueSoonDays', 'longOverdueDays'],
  },
  {
    title: '흐름 판단',
    description: '최근 활동과 완료 흐름 기준입니다.',
    keys: ['recentActivityDays', 'recentCompletionDays'],
  },
  {
    title: '담당자 부하',
    description: '담당자 과부하 기준을 조정합니다.',
    keys: ['overloadThreshold'],
  },
]

function SettingControlCard({
  control,
  value,
  onChange,
}: {
  control: {
    key: NumericSettingKey
    label: string
    description: string
    impact: string
    min: number
    max: number
  }
  value: number
  onChange: (key: NumericSettingKey, value: number) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{control.label}</div>
          <div className="mt-1 text-xs text-slate-500">{control.description}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{control.impact}</div>
        </div>
        <div className="w-20">
          <input
            type="number"
            min={control.min}
            max={control.max}
            value={value}
            onChange={(event) => onChange(control.key, Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm text-slate-700 outline-none focus:border-slate-300"
          />
        </div>
      </div>
      <input
        type="range"
        min={control.min}
        max={control.max}
        value={value}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
        className="mt-4 w-full accent-slate-900"
      />
    </div>
  )
}

export default function ThresholdSettingsForm({
  settings,
  onReset,
  onApplyPreset,
  onChangeSetting,
  onChangeWeight,
}: Props) {
  const [showAdvancedWeights, setShowAdvancedWeights] = useState(false)

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">프리셋</div>
            <div className="mt-1 text-xs text-slate-500">전체 성향을 먼저 고른 뒤, 필요한 경우에만 세부 기준을 조정합니다.</div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            기본값 복원
          </button>
        </div>
        <div className="rounded-[20px] border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-2">
          {(['conservative', 'default', 'relaxed'] as const).map((mode) => {
            const active = settings.presetMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onApplyPreset(mode)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-white bg-slate-900 text-white'
                    : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {getPresetLabel(mode)}
              </button>
            )
          })}
          </div>
        </div>

        <div className="rounded-2xl border border-white bg-white px-4 py-4 text-sm leading-6 text-slate-600">
          보수적 프리셋은 경고를 더 빨리 잡고, 완화 프리셋은 경고를 줄여서 노이즈를 낮춥니다. 운영 감각과 화면 신호가 크게 다를 때만 세부 값을 조정하는 편이 좋습니다.
        </div>
      </section>

      {SETTING_GROUPS.map((group) => (
        <section key={group.title} className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5">
          <div>
            <div className="text-sm font-semibold text-slate-900">{group.title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{group.description}</div>
          </div>

          <div className="space-y-3">
            {SETTING_CONTROLS.filter((control) => group.keys.includes(control.key)).map((control) => (
              <SettingControlCard
                key={control.key}
                control={control}
                value={settings[control.key]}
                onChange={onChangeSetting}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">고급 점수 가중치</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">정말 필요한 경우에만 조정하세요. 대부분은 위 기준만으로 충분합니다.</div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedWeights((current) => !current)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            {showAdvancedWeights ? '가중치 숨기기' : '가중치 보기'}
          </button>
        </div>

        {showAdvancedWeights ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {WEIGHT_CONTROLS.map((control) => (
              <label key={control.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm shadow-slate-200/10">
                <div className="font-medium text-slate-900">{control.label}</div>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={settings.weights[control.key]}
                  onChange={(event) => onChangeWeight(control.key, Number(event.target.value))}
                  className="mt-3 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-right outline-none focus:border-slate-300"
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
            세부 점수 조정이 필요할 때만 펼쳐서 수정합니다.
          </div>
        )}
      </section>
    </div>
  )
}