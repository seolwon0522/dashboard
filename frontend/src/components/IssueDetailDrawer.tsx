'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IssueAttachment, IssueDetail, JournalEntry } from '@/types/dashboard'
import { fetchIssueDetail } from '@/lib/api'
import { STATUS_GROUP_BADGE, PRIORITY_BADGE, getPriorityLabel } from '@/lib/labels'
import { buildRedmineAssetProxyUrl } from '@/lib/redmineAssets'
import IssueRichContent from './IssueRichContent'

// ── 필드명 한글 매핑 ──────────────────────────────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  status_id: 'Status',
  assigned_to_id: '담당자',
  priority_id: 'Priority',
  due_date: 'Due date',
  start_date: 'Start date',
  subject: 'Subject',
  description: 'Description',
  done_ratio: 'Progress',
  category_id: 'Category',
  fixed_version_id: 'Version',
  tracker_id: 'Tracker',
  estimated_hours: 'Estimated hours',
  parent_id: 'Parent issue',
  is_private: 'Private',
  project_id: 'Project',
}

function getFieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field
}

function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '미지정'
  return value
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '없음'
  return dateStr
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '크기 정보 없음'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isLongTextChange(field: string, oldValue: string | null | undefined, newValue: string | null | undefined): boolean {
  const textFields = new Set(['description', 'notes'])
  if (textFields.has(field)) return true

  const maxLength = Math.max(oldValue?.length ?? 0, newValue?.length ?? 0)
  return maxLength > 120 || /\n/.test(oldValue ?? '') || /\n/.test(newValue ?? '')
}

function renderChangeLine(change: JournalEntry['changes'][number], issueUrl: string) {
  const label = getFieldLabel(change.field)

  if (change.field === 'description') {
    return (
      <div className="text-xs text-gray-600">
        <span className="font-medium text-gray-500">{label}</span>
        <span className="ml-1 text-gray-700">변경됨</span>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-blue-500 hover:text-blue-700 hover:underline"
        >
          Redmine에서 확인
        </a>
      </div>
    )
  }

  if (isLongTextChange(change.field, change.old_value, change.new_value)) {
    return (
      <div className="text-xs text-gray-600">
        <span className="font-medium text-gray-500">{label}</span>
        <span className="ml-1 text-gray-700">내용 변경됨</span>
      </div>
    )
  }

  return (
    <div className="text-xs text-gray-600">
      <span className="font-medium text-gray-500">{label}</span>
      {': '}
      <span className="text-gray-400">{formatValue(change.old_value)}</span>
      <span className="mx-1 text-gray-300">→</span>
      <span className="text-gray-700">{formatValue(change.new_value)}</span>
    </div>
  )
}

function AttachmentList({ attachments, baseUrl }: { attachments: IssueAttachment[]; baseUrl: string }) {
  if (attachments.length === 0) return null

  return (
    <section>
      <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
        Attachments
      </h3>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={buildRedmineAssetProxyUrl(attachment.content_url, baseUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 break-all">{attachment.filename}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {attachment.content_type ?? '파일'} · {formatFileSize(attachment.filesize)}
              </div>
            </div>
            <span className="shrink-0 text-xs text-blue-600">열기</span>
          </a>
        ))}
      </div>
    </section>
  )
}

// ── 변경 이력 타임라인 ────────────────────────────────────────────────────────

function JournalTimeline({ journals, baseUrl, issueUrl }: { journals: JournalEntry[]; baseUrl: string; issueUrl: string }) {
  if (journals.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">변경 이력이 없습니다</p>
    )
  }

  // 시간 역순 정렬
  const sorted = [...journals].reverse()

  return (
    <div className="space-y-0">
      {sorted.map((j, idx) => {
        const hasChanges = j.changes.length > 0
        const hasNotes = !!j.notes

        if (!hasChanges && !hasNotes) return null

        return (
          <div key={j.id ?? idx} className="relative pl-5 pb-4 border-l-2 border-gray-200 last:border-l-0">
            {/* 타임라인 도트 */}
            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-400" />

            {/* 헤더: 시간 + 작성자 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-gray-400 tabular-nums">
                {formatDateTime(j.created_on)}
              </span>
              <span className="text-xs font-medium text-gray-600">{j.user || '시스템'}</span>
            </div>

            {/* 필드 변경 */}
            {hasChanges && (
              <div className="bg-gray-50 rounded px-2.5 py-1.5 mb-1.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">변경 사항</span>
                <div className="space-y-0.5">
                  {j.changes.map((c, ci) => (
                    <div key={ci}>{renderChangeLine(c, issueUrl)}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 코멘트/메모 — rich content 렌더링 */}
            {hasNotes && (
              <div className="issue-history-note mt-1 bg-yellow-50 border border-yellow-100 rounded px-2.5 py-2">
                <span className="text-[10px] font-semibold text-yellow-600 uppercase tracking-wide block mb-1">Note</span>
                <IssueRichContent
                  html={j.notes_html}
                  raw={j.notes}
                  baseUrl={baseUrl}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Key-Value 행 ──────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-1.5 text-sm">
      <span className="w-24 shrink-0 text-gray-400 text-xs font-medium">{label}</span>
      <span className="text-gray-700 text-xs break-all">{children}</span>
    </div>
  )
}

// ── 메인 Drawer ───────────────────────────────────────────────────────────────

interface Props {
  issueId: number | null
  onClose: () => void
}

export default function IssueDetailDrawer({ issueId, onClose }: Props) {
  const [detail, setDetail] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<number, IssueDetail>>(new Map())
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (issueId !== null) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [issueId, onClose])

  // 이슈 상세 조회
  useEffect(() => {
    if (issueId === null) {
      setDetail(null)
      return
    }

    // 캐시 히트
    const cached = cacheRef.current.get(issueId)
    if (cached) {
      setDetail(cached)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetchIssueDetail(issueId)
      .then((d) => {
        cacheRef.current.set(issueId, d)
        setDetail(d)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [issueId])

  // 패널이 열릴 때 스크롤 최상단으로
  useEffect(() => {
    if (detail && panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [detail])

  if (issueId === null) return null

  return (
    <>
      {/* 백드롭 (모바일 대응) */}
      <div
        className="fixed inset-0 bg-black/10 z-30 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer 패널 */}
      <aside
        ref={panelRef}
        className="issue-detail-drawer fixed right-0 top-0 h-full w-full sm:w-[540px] bg-white border-l border-gray-200 shadow-xl z-40 overflow-y-auto animate-slideIn"
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : detail ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">#{detail.id}</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      STATUS_GROUP_BADGE[detail.status_group] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {detail.status}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-gray-800 leading-snug break-words">
                  {detail.subject}
                </h2>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-4 py-3 space-y-4">
          {loading && (
            <div className="space-y-3 py-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
              <p className="font-semibold">이슈 상세를 불러올 수 없습니다</p>
              <p className="mt-1 text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && !detail && (
            <p className="text-sm text-gray-400 text-center py-8">이슈 정보가 없습니다</p>
          )}

          {!loading && detail && (
            <>
              {/* 원본 보기 링크 */}
              <a
                href={detail.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Redmine에서 보기
              </a>

              {/* 기본 정보 */}
              <section>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                  Detail
                </h3>
                <div className="divide-y divide-gray-50">
                  <InfoRow label="담당자">{detail.assigned_to ?? '미지정'}</InfoRow>
                  <InfoRow label="작성자">{detail.author ?? '미지정'}</InfoRow>
                  <InfoRow label="Priority">
                    {detail.priority ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          PRIORITY_BADGE[detail.priority] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getPriorityLabel(detail.priority)}
                      </span>
                    ) : '미지정'}
                  </InfoRow>
                  {detail.tracker && <InfoRow label="Tracker">{detail.tracker}</InfoRow>}
                  {detail.category && <InfoRow label="Category">{detail.category}</InfoRow>}
                  {detail.version && <InfoRow label="Version">{detail.version}</InfoRow>}
                  <InfoRow label="시작일">{formatDate(detail.start_date)}</InfoRow>
                  <InfoRow label="마감일">{formatDate(detail.due_date)}</InfoRow>
                  <InfoRow label="Progress">{detail.done_ratio}%</InfoRow>
                  <InfoRow label="생성일">{formatDateTime(detail.created_on)}</InfoRow>
                  <InfoRow label="최근 수정일">{formatDateTime(detail.updated_on)}</InfoRow>
                </div>
              </section>

              {/* 설명 */}
              <section>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                  Description
                </h3>
                {(detail.description || detail.description_html) ? (
                  <div className="bg-gray-50 rounded p-3 max-h-[50vh] overflow-y-auto">
                    <IssueRichContent
                      html={detail.description_html}
                      raw={detail.description}
                      baseUrl={detail.redmine_base_url}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">설명 없음</p>
                )}
              </section>

              <AttachmentList attachments={detail.attachments} baseUrl={detail.redmine_base_url} />

              {/* 변경 이력 */}
              <section>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                  History
                </h3>
                <JournalTimeline journals={detail.journals} baseUrl={detail.redmine_base_url} issueUrl={detail.url} />
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
