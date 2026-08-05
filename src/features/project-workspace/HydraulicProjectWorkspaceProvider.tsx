import {
  useState,
  type ReactNode,
} from 'react'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { useProjectSession } from '../project-session/useProjectSession'
import { useReportAssembly } from '../report-assembly/useReportAssembly'
import {
  DEFAULT_FIGURE_WORKSPACE,
} from '../figures/workspaceRegistry'
import type { AppWorkspaceId } from './hydraulicProjectWorkspaceContext'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
  const reportAssembly = useReportAssembly()
  const [activeFigureId, setActiveFigureId] = useState<AppWorkspaceId>(
    DEFAULT_FIGURE_WORKSPACE.id,
  )

  return (
    <HydraulicProjectWorkspaceContext.Provider
      value={{
        activeFigureId,
        setActiveFigureId,
        projectSession,
        projectDocument,
        reportAssembly,
      }}
    >
      {children}
    </HydraulicProjectWorkspaceContext.Provider>
  )
}
