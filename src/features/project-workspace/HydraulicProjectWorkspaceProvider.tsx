import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { WSE_DIFFERENCE_FIGURE_ID, type FigureId } from '../../core/figureIds'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { useProjectSession } from '../project-session/useProjectSession'

type HydraulicProjectWorkspaceValue = {
  activeFigureId: FigureId
  setActiveFigureId: (figureId: FigureId) => void
  projectSession: ReturnType<typeof useProjectSession>
  projectDocument: ReturnType<typeof useHydraulicProjectDocument>
}

const HydraulicProjectWorkspaceContext =
  createContext<HydraulicProjectWorkspaceValue | null>(null)

export function HydraulicProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode
}) {
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
  const [activeFigureId, setActiveFigureId] = useState<FigureId>(
    WSE_DIFFERENCE_FIGURE_ID,
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

export function useHydraulicProjectWorkspace() {
  const value = useContext(HydraulicProjectWorkspaceContext)
  if (!value) {
    throw new Error(
      'Hydraulic figure workspaces must be rendered inside HydraulicProjectWorkspaceProvider.',
    )
  }
  return value
}
