'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import ProjectSelect from '@/components/ProjectSelect'
import { fetchProjects } from '@/lib/api'
import {
  DASHBOARD_SETTINGS_STORAGE_KEY,
  MAX_RECENT_PROJECTS,
  RECENT_PROJECTS_STORAGE_KEY,
  buildDashboardModel,
  getPresetSettings,
  normalizeDashboardSettings,
  type DashboardModel,
  type DashboardScoreWeights,
  type DashboardThresholdSettings,
} from '@/lib/dashboard'
import type { NumericSettingKey } from '@/components/settings/ThresholdSettingsForm'
import { DASHBOARD_NAV_LABEL, formatSyncedLabel } from '@/lib/labels'
import useDashboardProjectData from '@/hooks/useDashboardProjectData'
import type { ProjectItem } from '@/types/dashboard'

interface DashboardProjectContextValue {
  projectId: string
  projects: ProjectItem[]
  projectName: string
  summary: ReturnType<typeof useDashboardProjectData>['summary']
  issueList: ReturnType<typeof useDashboardProjectData>['issueList']
  model: DashboardModel | null
  loading: boolean
  error: string | null
  lastSynced: Date | null
  refresh: () => void
  settings: DashboardThresholdSettings
  onResetSettings: () => void
  onApplySettingsPreset: (mode: 'conservative' | 'default' | 'relaxed') => void
  onChangeSetting: (key: NumericSettingKey, value: number) => void
  onChangeWeight: (key: keyof DashboardScoreWeights, value: number) => void
}

const DashboardProjectContext = createContext<DashboardProjectContextValue | null>(null)

export function useDashboardProjectContext(): DashboardProjectContextValue {
  const context = useContext(DashboardProjectContext)

  if (!context) {
    throw new Error('useDashboardProjectContext must be used within DashboardProjectLayout')
  }

  return context
}

interface Props {
  projectId: string
  children: ReactNode
}

export default function DashboardProjectLayout({ projectId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [settings, setSettings] = useState<DashboardThresholdSettings>(getPresetSettings('default'))
  const [settingsHydrated, setSettingsHydrated] = useState(false)
  const { summary, issueList, loading, error, lastSynced, refresh } = useDashboardProjectData(projectId)

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY)
      if (stored) {
        setSettings(normalizeDashboardSettings(JSON.parse(stored) as Partial<DashboardThresholdSettings>))
      } else {
        setSettings(getPresetSettings('default'))
      }
    } catch {
      setSettings(getPresetSettings('default'))
    } finally {
      setSettingsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!settingsHydrated || typeof window === 'undefined') return
    window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [settings, settingsHydrated])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)
      const current = stored ? JSON.parse(stored) : []
      const items = Array.isArray(current) ? current.filter((value): value is string => typeof value === 'string') : []
      const next = [projectId, ...items.filter((value) => value !== projectId)].slice(0, MAX_RECENT_PROJECTS)
      window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore local storage failures and keep navigation functional.
    }
  }, [projectId])

  const handleApplyPreset = useCallback((presetMode: 'conservative' | 'default' | 'relaxed') => {
    setSettings(getPresetSettings(presetMode))
  }, [])

  const handleResetSettings = useCallback(() => {
    setSettings(getPresetSettings('default'))
  }, [])

  const handleSettingChange = useCallback((key: NumericSettingKey, value: number) => {
    setSettings((current) => normalizeDashboardSettings({
      ...current,
      presetMode: 'custom',
      [key]: value,
    }))
  }, [])

  const handleWeightChange = useCallback((key: keyof DashboardScoreWeights, value: number) => {
    setSettings((current) => normalizeDashboardSettings({
      ...current,
      presetMode: 'custom',
      weights: {
        ...current.weights,
        [key]: value,
      },
    }))
  }, [])

  const projectName = projects.find((project) => project.id === projectId)?.name ?? projectId
  const model = useMemo(() => {
    if (!summary || !issueList) return null
    return buildDashboardModel(summary, issueList.issues, settings)
  }, [issueList, settings, summary])
  const syncedLabel = useMemo(() => {
    if (!lastSynced) return null
    return formatSyncedLabel(lastSynced)
  }, [lastSynced])

  const contextValue = useMemo<DashboardProjectContextValue>(() => ({
    projectId,
    projects,
    projectName,
    summary,
    issueList,
    model,
    loading,
    error,
    lastSynced,
    refresh,
    settings,
    onResetSettings: handleResetSettings,
    onApplySettingsPreset: handleApplyPreset,
    onChangeSetting: handleSettingChange,
    onChangeWeight: handleWeightChange,
  }), [error, handleApplyPreset, handleResetSettings, handleSettingChange, handleWeightChange, issueList, lastSynced, loading, model, projectId, projectName, projects, refresh, settings, summary])

  const navItems = [
    { href: `/dashboard/${encodeURIComponent(projectId)}`, label: DASHBOARD_NAV_LABEL.home },
    { href: `/dashboard/${encodeURIComponent(projectId)}/issues`, label: DASHBOARD_NAV_LABEL.issues },
    { href: `/dashboard/${encodeURIComponent(projectId)}/team`, label: DASHBOARD_NAV_LABEL.team },
    { href: `/dashboard/${encodeURIComponent(projectId)}/settings`, label: DASHBOARD_NAV_LABEL.settings },
  ]

  return (
    <DashboardProjectContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#f5f7fb] text-[#191f28]">
        <header className="sticky top-0 z-20 border-b border-[#eef2f6] bg-white/92 backdrop-blur-xl">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-4 sm:px-6">
            <Link href="/" className="rounded-[12px] p-2 text-[#8b95a1] transition-colors hover:bg-[#f2f4f6] hover:text-[#191f28]" title="프로젝트 목록으로">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div className="mr-auto min-w-0">
              <div className="text-xs font-semibold text-[#8b95a1]">운영 대시보드</div>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="truncate text-base font-semibold text-[#191f28]">{projectName}</h1>
                {syncedLabel ? <span className="hidden rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[11px] font-medium text-[#6b7684] lg:inline">{syncedLabel}</span> : null}
              </div>
            </div>

            <ProjectSelect
              projects={projects}
              selectedId={projectId}
              onChange={(nextProjectId) => nextProjectId && router.push(`/dashboard/${encodeURIComponent(nextProjectId)}`)}
            />

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-[12px] border border-[#e6ebf1] bg-white p-2 text-[#6b7684] transition-colors hover:bg-[#f8fafc] hover:text-[#191f28] disabled:opacity-40"
              title="대시보드 새로고침"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="mx-auto max-w-screen-2xl px-4 pb-4 sm:px-6">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-[16px] bg-[#f2f4f6] p-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'rounded-[12px] px-4 py-2 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-white text-[#191f28] shadow-[0_6px_16px_-12px_rgba(15,23,42,0.32)]'
                        : 'text-[#6b7684] hover:text-[#191f28]',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </header>

        {children}
      </div>
    </DashboardProjectContext.Provider>
  )
}