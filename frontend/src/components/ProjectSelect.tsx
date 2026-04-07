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
    <div className="flex items-center gap-2">
      <label htmlFor="project-select" className="text-sm font-medium text-gray-600 whitespace-nowrap">
        프로젝트
      </label>
      <select
        id="project-select"
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
