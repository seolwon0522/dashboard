'use client'

import { useCallback, useEffect, useState } from 'react'

import { fetchAllIssues, fetchSummary } from '@/lib/api'
import type { DashboardSummary, IssueListResponse } from '@/types/dashboard'

interface DashboardProjectDataResult {
  summary: DashboardSummary | null
  issueList: IssueListResponse | null
  loading: boolean
  error: string | null
  lastSynced: Date | null
  refresh: () => void
}

export default function useDashboardProjectData(projectId: string): DashboardProjectDataResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [issueList, setIssueList] = useState<IssueListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    Promise.all([fetchSummary(projectId), fetchAllIssues(projectId)])
      .then(([summaryResponse, issueResponse]) => {
        if (cancelled) return

        setSummary(summaryResponse)
        setIssueList(issueResponse)
        setLastSynced(new Date())
      })
      .catch((loadError: Error) => {
        if (cancelled) return
        setError(loadError.message)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  return {
    summary,
    issueList,
    loading,
    error,
    lastSynced,
    refresh,
  }
}