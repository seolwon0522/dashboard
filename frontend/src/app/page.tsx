'use client'

// 프로젝트 선택 페이지 (/)
// 프로젝트 목록을 카드로 보여주고, 클릭 시 /dashboard/[projectId]로 이동
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { fetchProjects } from '@/lib/api'
import { MAX_RECENT_PROJECTS, RECENT_PROJECTS_STORAGE_KEY } from '@/lib/dashboard'
import type { ProjectItem } from '@/types/dashboard'

export default function ProjectSelectPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>([])

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setRecentProjectIds(parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENT_PROJECTS))
      }
    } catch {
      setRecentProjectIds([])
    }
  }, [])

  const sortedProjects = useMemo(() => {
    return [...projects].sort((left, right) => {
      if (right.open_issues !== left.open_issues) {
        return right.open_issues - left.open_issues
      }

      return left.name.localeCompare(right.name, 'ko')
    })
  }, [projects])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return sortedProjects

    return sortedProjects.filter((project) => {
      return project.name.toLowerCase().includes(normalizedSearch) || project.id.toLowerCase().includes(normalizedSearch)
    })
  }, [normalizedSearch, sortedProjects])

  const recentProjects = useMemo(() => {
    return recentProjectIds
      .map((projectId) => sortedProjects.find((project) => project.id === projectId) ?? null)
      .filter((project): project is ProjectItem => project !== null)
  }, [recentProjectIds, sortedProjects])

  const topProject = sortedProjects[0] ?? null
  const overloadedProjects = sortedProjects.filter((project) => project.open_issues >= 10).length

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.2),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_42%,_#e8eef5_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 px-6 py-7 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.24),_transparent_28%)]" />
            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">관리용 현황판</div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">지금 바로 정리할 프로젝트를 먼저 고를 수 있는 시작 화면</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                오픈 이슈 규모와 최근 접근 프로젝트를 함께 보여줘서, 관리자 관점에서 우선 확인할 대상을 빠르게 고를 수 있게 정리했습니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-300">접근 가능한 프로젝트</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{projects.length}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-300">주의 프로젝트</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{overloadedProjects}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-300">가장 바쁜 프로젝트</div>
                  <div className="mt-2 text-base font-semibold text-white">{topProject ? topProject.name : '없음'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">빠른 선택</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">프로젝트명이나 ID로 바로 찾고, 최근 본 프로젝트가 있으면 먼저 다시 진입할 수 있습니다.</p>

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">프로젝트 검색</span>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="예: infra, backoffice, project-id"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">최근 접근</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{recentProjects.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">현재 검색 결과</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{filteredProjects.length}</div>
              </div>
            </div>

            {recentProjects.length > 0 ? (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">최근 본 프로젝트</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentProjects.map((project) => (
                    <Link
                      key={`recent-${project.id}`}
                      href={`/dashboard/${encodeURIComponent(project.id)}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      <span className="max-w-[180px] truncate">{project.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{project.open_issues}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <svg className="mr-2 h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          프로젝트 목록 불러오는 중...
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>오류 발생:</strong> {error}
          <p className="mt-1 text-red-500">백엔드 서버(포트 8000)가 실행 중인지 확인하세요.</p>
        </div>
      )}

      {/* 프로젝트 없음 */}
      {!loading && !error && projects.length === 0 && (
        <div className="py-20 text-center text-sm text-slate-400">
          접근 가능한 프로젝트가 없습니다.
        </div>
      )}

      {/* 프로젝트 카드 그리드 */}
      {!loading && !error && projects.length > 0 && (
        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">프로젝트 목록</div>
              <p className="mt-1 text-sm text-slate-500">오픈 이슈가 많은 순서대로 정렬했습니다. 카드에 들어가면 바로 현황판으로 이동합니다.</p>
            </div>
            <div className="text-xs font-medium text-slate-400">
              {normalizedSearch ? `"${search.trim()}" 검색 결과` : '전체 프로젝트'} · {filteredProjects.length}개
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <Link
                key={project.id}
                href={`/dashboard/${encodeURIComponent(project.id)}`}
                className="group block rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,1)_100%)] p-5 transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{index < 3 ? `Priority 0${index + 1}` : 'Project'}</div>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{project.name}</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">{project.id}</span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">오픈 이슈</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{project.open_issues}</div>
                  </div>
                  <div className="rounded-2xl px-3 py-2 text-xs font-semibold transition group-hover:bg-slate-950 group-hover:text-white">
                    현황판 열기
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              검색 조건에 맞는 프로젝트가 없습니다.
            </div>
          ) : null}
        </section>
      )}
      </div>
    </main>
  )
}
