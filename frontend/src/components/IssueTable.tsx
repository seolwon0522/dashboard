'use client'

// 전체 이슈 테이블 — 정렬, 검색, 페이지네이션, 행 클릭으로 Redmine 이동
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IssueListItem } from '@/types/dashboard'

type SortKey =
  | 'id'
  | 'subject'
  | 'status'
  | 'assigned_to'
  | 'priority'
  | 'due_date'
  | 'updated_on'

type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

const PRIORITY_ORDER: Record<string, number> = {
  Immediate: 5,
  Urgent: 4,
  High: 3,
  Normal: 2,
  Low: 1,
}

const STATUS_GROUP_BADGE: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  Immediate: 'bg-red-100 text-red-700',
  Urgent: 'bg-orange-100 text-orange-700',
  High: 'bg-amber-100 text-amber-700',
  Normal: 'bg-gray-100 text-gray-500',
  Low: 'bg-gray-50 text-gray-400',
}

interface Props {
  issues: IssueListItem[]
  loading?: boolean
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1 text-xs">↕</span>
  return <span className="text-blue-500 ml-1 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>
}

function ThButton({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onClick: (key: SortKey) => void
}) {
  return (
    <th
      className="px-3 py-2.5 text-left cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 transition-colors"
      onClick={() => onClick(sortKey)}
    >
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
        <SortIcon active={current === sortKey} dir={dir} />
      </span>
    </th>
  )
}

interface PagBtnProps {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}
function PagBtn({ label, onClick, disabled, active }: PagBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'min-w-[28px] h-7 rounded px-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export default function IssueTable({ issues, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('updated_on')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const prevIssuesRef = useRef(issues)

  // Reset page when issue list changes (filter/project switch)
  useEffect(() => {
    if (prevIssuesRef.current !== issues) {
      prevIssuesRef.current = issues
      setPage(1)
    }
  }, [issues])

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('desc')
      return key
    })
    setPage(1)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return issues
    return issues.filter(
      (i) =>
        i.subject.toLowerCase().includes(q) ||
        (i.assigned_to?.toLowerCase().includes(q) ?? false) ||
        String(i.id).includes(q),
    )
  }, [issues, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'id':
          cmp = a.id - b.id
          break
        case 'subject':
          cmp = a.subject.localeCompare(b.subject)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'assigned_to':
          cmp = (a.assigned_to ?? '\uffff').localeCompare(b.assigned_to ?? '\uffff')
          break
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority ?? ''] ?? 0) - (PRIORITY_ORDER[b.priority ?? ''] ?? 0)
          break
        case 'due_date':
          cmp = (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99')
          break
        case 'updated_on':
          cmp = (a.updated_on ?? '').localeCompare(b.updated_on ?? '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Page window for pagination buttons
  const pageWindow = useMemo(() => {
    const half = 2
    const start = Math.max(1, Math.min(safePage - half, totalPages - half * 2))
    const end = Math.min(totalPages, start + half * 2)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [safePage, totalPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading issues...
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by title, assignee, ID…"
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
          />
        </div>
        <span className="text-xs text-gray-400">
          {filtered.length.toLocaleString()} issue{filtered.length !== 1 ? 's' : ''}
          {search.trim() && ` matching "${search.trim()}"`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <ThButton label="ID" sortKey="id" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Title" sortKey="subject" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Assignee" sortKey="assigned_to" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Priority" sortKey="priority" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Due" sortKey="due_date" current={sortKey} dir={sortDir} onClick={handleSort} />
              <ThButton label="Updated" sortKey="updated_on" current={sortKey} dir={sortDir} onClick={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-gray-400 text-sm">
                  {search.trim()
                    ? `No issues match "${search.trim()}"`
                    : 'No issues for the current filters.'}
                </td>
              </tr>
            ) : (
              pageItems.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => window.open(issue.url, '_blank', 'noopener,noreferrer')}
                  className={[
                    'cursor-pointer transition-colors group',
                    issue.is_overdue
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'hover:bg-blue-50',
                  ].join(' ')}
                >
                  <td className="px-3 py-2.5 text-xs text-gray-400 font-mono tabular-nums whitespace-nowrap">
                    #{issue.id}
                  </td>
                  <td className="px-3 py-2.5 max-w-xs">
                    <span
                      className="text-gray-800 text-sm font-medium group-hover:text-blue-600 leading-snug"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={issue.subject}
                    >
                      {issue.subject}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_GROUP_BADGE[issue.status_group] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td
                    className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap max-w-[120px] truncate"
                    title={issue.assigned_to ?? undefined}
                  >
                    {issue.assigned_to ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {issue.priority ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          PRIORITY_BADGE[issue.priority] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {issue.priority}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {issue.due_date ? (
                      <span
                        className={`text-xs tabular-nums ${
                          issue.is_overdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                        }`}
                      >
                        {issue.due_date}
                        {issue.is_overdue && (
                          <span className="ml-1 text-red-500 text-[11px]">+{issue.days_overdue}d</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                    {issue.updated_on ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <PagBtn disabled={safePage === 1} onClick={() => setPage(1)} label="«" />
            <PagBtn disabled={safePage === 1} onClick={() => setPage((p) => p - 1)} label="‹" />
            {pageWindow.map((p) => (
              <PagBtn key={p} active={p === safePage} onClick={() => setPage(p)} label={String(p)} />
            ))}
            <PagBtn disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)} label="›" />
            <PagBtn disabled={safePage === totalPages} onClick={() => setPage(totalPages)} label="»" />
          </div>
        </div>
      )}
    </div>
  )
}
