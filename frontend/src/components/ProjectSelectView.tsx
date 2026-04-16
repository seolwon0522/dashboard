'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import Badge from '@/components/Badge'
import type { RedmineConnectionStatusResponse } from '@/types/redmine-connection'
import { fetchProjects } from '@/lib/api'
import { MAX_RECENT_PROJECTS, RECENT_PROJECTS_STORAGE_KEY } from '@/lib/dashboard'
import type { ProjectItem } from '@/types/dashboard'

interface Props {
  connectionStatus: RedmineConnectionStatusResponse
  onOpenConnectionSettings: () => void
  onDeleteConnection: () => Promise<void> | void
}

function getRiskTone(level: ProjectItem['risk_level']) {
  if (level === 'critical') return 'danger' as const
  if (level === 'warning') return 'warning' as const
  return 'success' as const
}

function getRiskLabel(level: ProjectItem['risk_level']) {
  if (level === 'critical') return '위험'
  if (level === 'warning') return '주의'
  return '안정'
}

export default function ProjectSelectView({ connectionStatus, onOpenConnectionSettings, onDeleteConnection }: Props) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>([])
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null)

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
      if (right.risk_score !== left.risk_score) {
        return right.risk_score - left.risk_score
      }

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

  const previewProject = useMemo(() => {
    if (!filteredProjects.length) return null
    if (!previewProjectId) {
      if (!normalizedSearch && recentProjects.length > 0) {
        return recentProjects[0]
      }
      return filteredProjects[0]
    }
    return filteredProjects.find((project) => project.id === previewProjectId) ?? filteredProjects[0]
  }, [filteredProjects, normalizedSearch, previewProjectId, recentProjects])

  const topProject = sortedProjects[0] ?? null
  const warningProjects = sortedProjects.filter((project) => project.risk_level !== 'stable').length
  const criticalProjects = sortedProjects.filter((project) => project.risk_level === 'critical').length
  const focusProjects = sortedProjects.filter((project) => project.risk_score > 0).slice(0, 3)
  const connection = connectionStatus.connection
  const authMethod = connection?.auth_type === 'basic' ? 'ID / 비밀번호' : 'API 키'

  useEffect(() => {
    if (!filteredProjects.length) {
      setPreviewProjectId(null)
      return
    }

    setPreviewProjectId((current) => {
      if (current && filteredProjects.some((project) => project.id === current)) {
        return current
      }
      return filteredProjects[0].id
    })
  }, [filteredProjects])

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-[24px] border border-[#d6e8ff] bg-white px-5 py-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.18)] sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#3182f6]">외부 시스템 연결</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#191f28]">Redmine 연결이 준비되었습니다</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <span className="font-medium text-[#191f28]">{connection?.base_url}</span> 에 <span className="font-medium text-[#191f28]">{authMethod}</span> 방식으로 연결되어 있습니다. 여기서 바로 프로젝트를 고르거나 연결 설정을 다시 열 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenConnectionSettings}
                className="rounded-[14px] border border-[#d7e0ea] bg-white px-4 py-3 text-sm font-semibold text-[#4e5968] transition hover:bg-[#f8fafc] hover:text-[#191f28]"
              >
                Redmine 연결 설정
              </button>
              {connectionStatus.can_save ? (
                <button
                  type="button"
                  onClick={() => void onDeleteConnection()}
                  className="rounded-[14px] border border-[#ffd9d9] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#d64545] transition hover:bg-[#fff0f0]"
                >
                  저장된 연결 삭제
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-[#eef2f6] bg-[#f9fbfd] px-4 py-4">
              <div className="text-xs font-semibold text-[#8b95a1]">인증 방식</div>
              <div className="mt-2 text-base font-semibold text-[#191f28]">{authMethod}</div>
              <div className="mt-1 text-xs text-[#6b7684]">{connection?.auth_identity}</div>
            </div>
            <div className="rounded-[18px] border border-[#eef2f6] bg-[#f9fbfd] px-4 py-4">
              <div className="text-xs font-semibold text-[#8b95a1]">확인된 계정</div>
              <div className="mt-2 text-base font-semibold text-[#191f28]">{connectionStatus.server_user ?? '검증 완료'}</div>
              <div className="mt-1 text-xs text-[#6b7684]">{connectionStatus.warning ?? `${connection?.base_url ?? 'Redmine'} 연결 테스트가 정상적으로 완료되었습니다.`}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[#e6ebf1] bg-white px-6 py-6 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.18)] sm:px-7">
            <div className="text-xs font-semibold text-[#8b95a1]">프로젝트 선택</div>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.3] tracking-tight text-[#191f28]">복잡한 정보 대신 지금 열어야 할 프로젝트부터 보여줍니다</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4e5968]">위험 신호가 큰 프로젝트를 먼저 위로 올리고, 선택 전에는 오른쪽에서 핵심 이유만 짧게 미리 볼 수 있게 정리했습니다.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-[#f9fbfd] px-4 py-4">
                <div className="text-xs font-semibold text-[#8b95a1]">전체 프로젝트</div>
                <div className="mt-2 text-[28px] font-semibold text-[#191f28]">{projects.length}</div>
              </div>
              <div className="rounded-[18px] bg-[#f9fbfd] px-4 py-4">
                <div className="text-xs font-semibold text-[#8b95a1]">주의 이상</div>
                <div className="mt-2 text-[28px] font-semibold text-[#191f28]">{warningProjects}</div>
              </div>
              <div className="rounded-[18px] bg-[#eef6ff] px-4 py-4">
                <div className="text-xs font-semibold text-[#5b708b]">먼저 볼 후보</div>
                <div className="mt-2 line-clamp-1 text-base font-semibold text-[#191f28]">{topProject ? topProject.name : '표시할 프로젝트가 없습니다.'}</div>
                <div className="mt-1 text-xs leading-5 text-[#4e5968]">{topProject ? topProject.primary_reason : '프로젝트 데이터가 준비되면 우선 확인 대상을 보여줍니다.'}</div>
              </div>
            </div>

            {focusProjects.length > 0 ? (
              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-[#191f28]">먼저 확인할 프로젝트</div>
                <div className="space-y-2">
                  {focusProjects.map((project, index) => (
                    <Link
                      key={`focus-${project.id}`}
                      href={`/dashboard/${encodeURIComponent(project.id)}`}
                      className="flex items-start justify-between gap-3 rounded-[18px] border border-[#e6ebf1] bg-[#f9fbfd] px-4 py-4 transition-colors hover:border-[#d6e8ff] hover:bg-white"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#8b95a1]">우선순위 {index + 1}</div>
                        <div className="mt-1 text-base font-semibold text-[#191f28]">{project.name}</div>
                        <div className="mt-1 text-sm leading-6 text-[#4e5968]">{project.primary_reason}</div>
                      </div>
                      <Badge tone={getRiskTone(project.risk_level)} size="md">{getRiskLabel(project.risk_level)}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-[#e6ebf1] bg-white p-6 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.18)]">
            <div className="text-sm font-semibold text-[#191f28]">빠르게 열기</div>
            <p className="mt-2 text-sm leading-6 text-[#4e5968]">프로젝트명이나 ID로 바로 찾고, 방금 보던 프로젝트는 아래에서 다시 열 수 있습니다.</p>

            {recentProjects[0] ? (
              <Link
                href={`/dashboard/${encodeURIComponent(recentProjects[0].id)}`}
                className="mt-5 flex items-center justify-between gap-3 rounded-[20px] border border-[#d6e8ff] bg-[#eef6ff] px-4 py-4 transition-colors hover:border-[#bcd9ff] hover:bg-white"
              >
                <div>
                  <div className="text-xs font-semibold text-[#5b708b]">기본 이어보기</div>
                  <div className="mt-1 text-base font-semibold text-[#191f28]">{recentProjects[0].name}</div>
                </div>
                <Badge tone={getRiskTone(recentProjects[0].risk_level)} size="md">최근 프로젝트</Badge>
              </Link>
            ) : null}

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold text-[#8b95a1]">프로젝트 검색</span>
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
                  className="w-full rounded-[16px] border border-[#e6ebf1] bg-[#f9fbfd] py-3 pl-10 pr-4 text-sm text-[#191f28] outline-none transition focus:border-[#b2d4ff] focus:bg-white focus:ring-4 focus:ring-[#eef6ff]"
                />
              </div>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-[#f9fbfd] px-4 py-4">
                <div className="text-xs font-semibold text-[#8b95a1]">최근 접근</div>
                <div className="mt-2 text-2xl font-semibold text-[#191f28]">{recentProjects.length}</div>
              </div>
              <div className="rounded-[18px] bg-[#f9fbfd] px-4 py-4">
                <div className="text-xs font-semibold text-[#8b95a1]">즉시 점검</div>
                <div className="mt-2 text-2xl font-semibold text-[#191f28]">{criticalProjects}</div>
              </div>
            </div>

            {previewProject ? (
              <div className="mt-5 rounded-[20px] border border-[#d6e8ff] bg-[#eef6ff] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#5b708b]">선택 전 미리 보기</div>
                    <div className="mt-2 text-base font-semibold text-[#191f28]">{previewProject.name}</div>
                  </div>
                  <Badge tone={getRiskTone(previewProject.risk_level)} size="md">{getRiskLabel(previewProject.risk_level)}</Badge>
                </div>

                <div className="mt-3 rounded-[16px] border border-white bg-white px-4 py-3 text-sm leading-6 text-[#4e5968]">
                  {previewProject.primary_reason}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-[#8b95a1]">즉시 확인</div>
                    <div className="mt-2 text-sm font-semibold text-[#191f28]">지연 {previewProject.overdue_issues} · 정체 {previewProject.stale_issues}</div>
                    <div className="mt-1 text-xs text-[#6b7684]">일정과 진행 정체 신호</div>
                  </div>
                  <div className="rounded-[16px] border border-white bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-[#8b95a1]">담당 상태</div>
                    <div className="mt-2 text-sm font-semibold text-[#191f28]">미할당 {previewProject.unassigned_issues} · 고우선 {previewProject.high_priority_issues}</div>
                    <div className="mt-1 text-xs text-[#6b7684]">소유권과 중요도 신호</div>
                  </div>
                </div>
              </div>
            ) : null}

            {recentProjects.length > 0 ? (
              <div className="mt-5">
                <div className="text-xs font-semibold text-[#8b95a1]">최근 본 프로젝트</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentProjects.map((project) => (
                    <Link
                      key={`recent-${project.id}`}
                      href={`/dashboard/${encodeURIComponent(project.id)}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e6ebf1] bg-white px-3 py-2 text-sm font-medium text-[#4e5968] transition hover:bg-[#f8fafc] hover:text-[#191f28]"
                    >
                      <span className="max-w-[180px] truncate">{project.name}</span>
                      <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[11px] font-semibold text-[#6b7684]">{project.open_issues}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="mr-2 h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            프로젝트 목록 불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>오류 발생:</strong> {error}
            <p className="mt-1 text-red-500">백엔드 서버(포트 8000)가 실행 중인지 확인하세요.</p>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="py-20 text-center text-sm text-slate-500">현재 연결로 접근 가능한 프로젝트가 없습니다. Redmine 연결 설정이나 계정 권한을 다시 확인해 보세요.</div>
        )}

        {!loading && !error && projects.length > 0 && (
          <section className="rounded-[24px] border border-[#e6ebf1] bg-white p-5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.18)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#191f28]">프로젝트 목록</div>
                <p className="mt-1 text-sm text-[#4e5968]">복잡한 카드 대신 핵심 이유와 바로 열기 동선만 남겼습니다.</p>
              </div>
              <div className="text-xs font-medium text-[#8b95a1]">
                {normalizedSearch ? `"${search.trim()}" 검색 결과` : '전체 프로젝트'} · {filteredProjects.length}개
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${encodeURIComponent(project.id)}`}
                  onMouseEnter={() => setPreviewProjectId(project.id)}
                  onFocus={() => setPreviewProjectId(project.id)}
                  className="group block rounded-[20px] border border-[#e6ebf1] bg-white p-5 transition-colors hover:border-[#d6e8ff] hover:bg-[#fbfdff]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-[#8b95a1]">{index < 3 ? `먼저 확인 0${index + 1}` : 'Project'}</div>
                      <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#191f28]">{project.name}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={getRiskTone(project.risk_level)} size="md">{getRiskLabel(project.risk_level)}</Badge>
                        <span className="text-xs font-semibold text-[#6b7684]">위험 점수 {project.risk_score}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#6b7684]">{project.id}</span>
                  </div>

                  <div className="mt-4 rounded-[16px] bg-[#f9fbfd] px-4 py-3 text-sm leading-6 text-[#4e5968]">
                    {project.primary_reason}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[#8b95a1]">핵심 신호</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#4e5968]">
                        <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1">지연 {project.overdue_issues}</span>
                        <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1">정체 {project.stale_issues}</span>
                        <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1">미할당 {project.unassigned_issues}</span>
                        <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1">고우선 {project.high_priority_issues}</span>
                      </div>
                      <div className="mt-2 text-xs text-[#8b95a1]">활성 작업 {project.open_issues}건 · 임박 일정 {project.due_soon_issues}건</div>
                    </div>
                    <div className="rounded-[14px] bg-[#3182f6] px-3 py-2 text-xs font-semibold text-white">현황판 열기</div>
                  </div>
                </Link>
              ))}
            </div>

            {filteredProjects.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                검색 조건과 맞는 프로젝트가 없습니다. 프로젝트명 대신 ID 일부로 다시 찾거나 검색어를 줄여 보세요.
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  )
}