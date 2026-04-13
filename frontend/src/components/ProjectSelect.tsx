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
    <div className="flex items-center gap-2 rounded-[16px] border border-[#e6ebf1] bg-[#f9fbfd] px-3 py-2">
      <label htmlFor="project-select" className="whitespace-nowrap text-xs font-semibold text-[#8b95a1]">
        프로젝트
      </label>
      <select
        id="project-select"
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="min-w-[180px] rounded-[12px] border border-[#e6ebf1] bg-white px-3 py-2 text-sm font-medium text-[#191f28] outline-none transition focus:border-[#b2d4ff] focus:ring-4 focus:ring-[#eef6ff]"
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
