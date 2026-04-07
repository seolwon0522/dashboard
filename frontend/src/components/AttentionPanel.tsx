'use client'

// 주의 필요 이슈 패널 — Overdue / Due Soon / High Priority 탭
import { useMemo, useState } from 'react'
import type { IssueListItem } from '@/types/dashboard'
import { PRIORITY_BADGE, getPriorityLabel } from '@/lib/labels'

interface Props {
  issues: IssueListItem[]
  loading?: boolean
}

type Tab = 'overdue' | 'due_soon' | 'high_priority'

const HIGH_PRIORITY = new Set(['Immediate', 'Urgent', 'High'])

function IssueRow({ issue }: { issue: IssueListItem }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 py-2 px-3 hover:bg-gray-50 transition-colors group"
    >
      <span className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5 shrink-0 w-10 text-right">
        #{issue.id}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium text-gray-800 group-hover:text-blue-600 leading-snug"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {issue.subject}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {issue.priority && HIGH_PRIORITY.has(issue.priority) && (
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                PRIORITY_BADGE[issue.priority] ?? 'bg-gray-100 text-gray-500'
              }`}
            >
              {getPriorityLabel(issue.priority)}
            </span>
          )}
          {issue.assigned_to && (
            <span className="text-[11px] text-gray-400 truncate max-w-[120px]" title={issue.assigned_to}>
              {issue.assigned_to}
            </span>
          )}
          {!issue.assigned_to && (
            <span className="text-[11px] text-gray-300 italic">미할당</span>
          )}
          {issue.is_overdue && (
            <span className="text-[11px] font-semibold text-red-600 shrink-0">
              +{issue.days_overdue}d overdue
            </span>
          )}
          {issue.due_date && !issue.is_overdue && (
            <span className="text-[11px] text-gray-400 shrink-0">Due {issue.due_date}</span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function AttentionPanel({ issues, loading }: Props) {
  const [tab, setTab] = useState<Tab>('overdue')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const sevenDaysLater = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }, [])

  const overdue = useMemo(
    () =>
      issues
        .filter((i) => i.is_overdue)
        .sort((a, b) => b.days_overdue - a.days_overdue),
    [issues],
  )

  const dueSoon = useMemo(
    () =>
      issues
        .filter(
          (i) =>
            !i.is_overdue &&
            i.due_date != null &&
            i.due_date >= today &&
            i.due_date <= sevenDaysLater,
        )
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [issues, today, sevenDaysLater],
  )

  const highPriority = useMemo(
    () =>
      issues
        .filter((i) => i.priority != null && HIGH_PRIORITY.has(i.priority) && !i.is_overdue)
        .slice(0, 20),
    [issues],
  )

  const tabs: { id: Tab; label: string; count: number; urgent?: boolean }[] = [
    { id: 'overdue', label: 'Overdue', count: overdue.length, urgent: overdue.length > 0 },
    { id: 'due_soon', label: 'Due Soon', count: dueSoon.length },
    { id: 'high_priority', label: 'High Priority', count: highPriority.length },
  ]

  const activeItems = tab === 'overdue' ? overdue : tab === 'due_soon' ? dueSoon : highPriority

  const emptyMessage: Record<Tab, string> = {
    overdue: 'No overdue issues.',
    due_soon: 'No issues due within 7 days.',
    high_priority: 'No open high-priority issues.',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 px-3 py-2.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-500 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  t.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '280px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading issues...
          </div>
        ) : activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1.5">
            <span className="text-green-500 text-lg">✓</span>
            <p className="text-sm text-gray-400">{emptyMessage[tab]}</p>
          </div>
        ) : (
          activeItems.slice(0, 25).map((issue) => <IssueRow key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  )
}
