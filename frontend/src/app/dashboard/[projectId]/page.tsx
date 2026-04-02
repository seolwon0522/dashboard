'use client'

// 프로젝트별 대시보드 페이지 (/dashboard/[projectId])
// URL 파라미터에서 projectId를 읽어 DashboardView에 전달
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import DashboardView from '@/components/DashboardView'
import ProjectSelect from '@/components/ProjectSelect'
import { fetchProjects } from '@/lib/api'
import type { ProjectItem } from '@/types/dashboard'

export default function DashboardPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = decodeURIComponent(params.projectId)

  // 상단 드롭다운용 프로젝트 목록
  const [projects, setProjects] = useState<ProjectItem[]>([])

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch(() => console.error('프로젝트 목록 로드 실패'))
  }, [])

  // 현재 프로젝트명 표시
  const currentProjectName =
    projects.find((p) => p.id === projectId)?.name ?? projectId

  // 드롭다운에서 프로젝트 변경 시 해당 라우트로 이동
  const handleProjectChange = (id: string | undefined) => {
    if (id) {
      router.push(`/dashboard/${encodeURIComponent(id)}`)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      {/* ── 헤더 영역 ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* 프로젝트 선택 화면으로 돌아가기 */}
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="프로젝트 선택으로 돌아가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Redmine Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              현재 조회 중: <span className="font-medium text-gray-700">{currentProjectName}</span>
            </p>
          </div>
        </div>

        {/* 프로젝트 전환 드롭다운 */}
        <ProjectSelect
          projects={projects}
          selectedId={projectId}
          onChange={handleProjectChange}
        />
      </div>

      {/* ── 대시보드 본체 ── */}
      <DashboardView projectId={projectId} />
    </main>
  )
}
