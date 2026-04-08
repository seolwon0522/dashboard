// 프로젝트 선택 드롭다운 컴포넌트
// 대시보드 헤더에서 프로젝트를 전환할 때 사용
import type { ProjectItem } from '@/types/dashboard'

interface Props {
  projects: ProjectItem[]
  // 현재 선택된 프로젝트 ID
  selectedId: string | undefined
  onChange: (id: string | undefined) => void
}

export default function ProjectSelect({ projects, selectedId, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm shadow-slate-200/40 backdrop-blur">
      <label htmlFor="project-select" className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        프로젝트
      </label>
      <select
        id="project-select"
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
      >
        <option value="" disabled>프로젝트 선택</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.open_issues} 오픈)
          </option>
        ))}
      </select>
    </div>
  )
}
