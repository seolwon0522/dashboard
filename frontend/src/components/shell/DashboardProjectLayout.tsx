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
import { formatSyncedLabel } from '@/lib/labels'
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
    { href: `/dashboard/${encodeURIComponent(projectId)}`, label: 'Home' },
    { href: `/dashboard/${encodeURIComponent(projectId)}/issues`, label: 'Issues' },
    { href: `/dashboard/${encodeURIComponent(projectId)}/team`, label: 'Team' },
    { href: `/dashboard/${encodeURIComponent(projectId)}/settings`, label: 'Settings' },
  ]

  return (
    <DashboardProjectContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="프로젝트 목록으로">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <div className="mr-auto min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">운영 대시보드</div>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-slate-900">{projectName}</h1>
              </div>
            </div>

            <ProjectSelect
              projects={projects}
              selectedId={projectId}
              onChange={(nextProjectId) => nextProjectId && router.push(`/dashboard/${encodeURIComponent(nextProjectId)}`)}
            />

            {syncedLabel ? <span className="hidden text-xs text-slate-400 lg:inline">{syncedLabel}</span> : null}

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
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

          <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-4 pb-3 sm:px-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </header>

        {children}
      </div>
    </DashboardProjectContext.Provider>
  )
}