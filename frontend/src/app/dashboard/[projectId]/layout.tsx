import type { ReactNode } from 'react'

import DashboardProjectLayout from '@/components/shell/DashboardProjectLayout'

interface Props {
  children: ReactNode
  params: Promise<{ projectId: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const { projectId } = await params

  return (
    <DashboardProjectLayout projectId={decodeURIComponent(projectId)}>
      {children}
    </DashboardProjectLayout>
  )
}