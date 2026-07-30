import {
  useState,
  type ReactNode,
} from 'react'
import { WSE_DIFFERENCE_FIGURE_ID, type FigureId } from '../../core/figureIds'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { useProjectSession } from '../project-session/useProjectSession'
import { HydraulicProjectWorkspaceContext } from './hydraulicProjectWorkspaceContext'

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
