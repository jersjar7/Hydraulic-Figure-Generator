import {
  useState,
  type ReactNode,
} from 'react'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { useProjectSession } from '../project-session/useProjectSession'
import {
  DEFAULT_FIGURE_WORKSPACE,
  type FigureId,
} from '../figures/workspaceRegistry'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
  const [activeFigureId, setActiveFigureId] = useState<FigureId>(
    DEFAULT_FIGURE_WORKSPACE.id,
  )

  return (
    <HydraulicProjectWorkspaceContext.Provider
      value={{
        activeFigureId,
        setActiveFigureId,
        projectSession,
        projectDocument,
      }}
    >
      {children}
    </HydraulicProjectWorkspaceContext.Provider>
  )
}
