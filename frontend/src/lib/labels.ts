// 공통 한국어 레이블 / 상태 매핑 상수
// KPI, 상태 분포, 담당자 현황, 이슈 테이블 모두 이 파일 기준으로 통일

// ── 상태 그룹 → 한국어 표시 매핑 ─────────────────────────────────────────────
// 백엔드 status_group 값: 'open' | 'in_progress' | 'closed' | 'other'
export const STATUS_GROUP_LABEL: Record<string, string> = {
  open:        '열림',
  in_progress: '진행 중',
  closed:      '완료',
  other:       '기타',
}

export const ISSUE_PRESET_LABEL: Record<string, string> = {
  attention: '조치 필요',
  overdue: '기한 초과',
  due_soon: '이번 주 마감',
  stale: '정체',
  high_priority: '높은 우선순위',
  unassigned: '미할당',
  closed_recently: '최근 완료 7일',
}

export const RELATION_LABEL: Record<string, string> = {
  parent: '상위 이슈',
  child: '하위 이슈',
  relates: '연관',
  blocks: '차단',
  blocked: '차단됨',
  precedes: '선행',
  follows: '후행',
  copied_to: '복사 대상',
  copied_from: '복사 원본',
  duplicates: '중복',
  duplicated: '중복 대상',
}

// ── 상태 그룹 → 뱃지 CSS 클래스 ──────────────────────────────────────────────
export const STATUS_GROUP_BADGE: Record<string, string> = {
  open:        'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed:      'bg-green-100 text-green-800',
  other:       'bg-gray-100 text-gray-600',
}

// ── 우선순위 → 한국어 표시 매핑 ──────────────────────────────────────────────
export const PRIORITY_LABEL: Record<string, string> = {
  Immediate: '즉시',
  Urgent:    '긴급',
  High:      '높음',
  Normal:    '보통',
  Low:       '낮음',
}

// ── 우선순위 → 뱃지 CSS 클래스 ───────────────────────────────────────────────
export const PRIORITY_BADGE: Record<string, string> = {
  Immediate: 'bg-red-100 text-red-700',
  Urgent:    'bg-orange-100 text-orange-700',
  High:      'bg-amber-100 text-amber-700',
  Normal:    'bg-gray-100 text-gray-500',
  Low:       'bg-gray-50 text-gray-400',
}

// ── 우선순위 정렬 순서 ────────────────────────────────────────────────────────
export const PRIORITY_ORDER: Record<string, number> = {
  Immediate: 5,
  Urgent:    4,
  High:      3,
  Normal:    2,
  Low:       1,
}

// ── 동기화 시각 포맷 (한국어) ─────────────────────────────────────────────────
export function formatSyncedLabel(date: Date): string {
  const diff = Math.round((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '방금 동기화됨'
  if (diff < 3600) return `${Math.round(diff / 60)}분 전 동기화`
  return `${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 동기화`
}

// ── 우선순위 표시명 반환 (없으면 원본 반환) ───────────────────────────────────
export function getPriorityLabel(priority: string | null | undefined): string {
  if (!priority) return '—'
  return PRIORITY_LABEL[priority] ?? priority
}
