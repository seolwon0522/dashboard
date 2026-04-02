'use client'

// 프로젝트 선택 페이지 (/)
// 프로젝트 목록을 카드로 보여주고, 클릭 시 /dashboard/[projectId]로 이동
import { useEffect, useState } from 'react'
import Link from 'next/link'

import { fetchProjects } from '@/lib/api'
import type { ProjectItem } from '@/types/dashboard'

export default function ProjectSelectPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Redmine Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          대시보드를 볼 프로젝트를 선택하세요
        </p>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          프로젝트 목록 불러오는 중...
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm max-w-md mx-auto">
          <strong>오류 발생:</strong> {error}
          <p className="mt-1 text-red-500">백엔드 서버(포트 8000)가 실행 중인지 확인하세요.</p>
        </div>
      )}

      {/* 프로젝트 없음 */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-20">
          접근 가능한 프로젝트가 없습니다.
        </div>
      )}

      {/* 프로젝트 카드 그리드 */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${encodeURIComponent(project.id)}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
            >
              <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
              <p className="text-sm text-gray-500 mt-2">
                오픈 이슈 <span className="font-medium text-blue-600">{project.open_issues}</span>건
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
