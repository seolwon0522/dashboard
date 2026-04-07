'use client'

// 프로젝트별 대시보드 라우팅 셸 (/dashboard/[projectId])
// 프로젝트 목록을 조회해 DashboardView에 전달. 레이아웃/데이터 로직은 DashboardView에 위임.
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import DashboardView from '@/components/DashboardView'
import { fetchProjects } from '@/lib/api'
import type { ProjectItem } from '@/types/dashboard'

export default function DashboardPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = decodeURIComponent(params.projectId)

  const [projects, setProjects] = useState<ProjectItem[]>([])

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => {})
  }, [])

  const projectName = projects.find((p) => p.id === projectId)?.name ?? projectId

  return (
    <DashboardView
      projectId={projectId}
      projects={projects}
      projectName={projectName}
      onProjectChange={(id) => router.push(`/dashboard/${encodeURIComponent(id)}`)}
    />
  )
}
