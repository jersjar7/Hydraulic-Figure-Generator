import { createContext } from 'react'
import type { FigureId } from '../../core/figureIds'
import type { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import type { useProjectSession } from '../project-session/useProjectSession'

export type HydraulicProjectWorkspaceValue = {
  activeFigureId: FigureId
  setActiveFigureId: (figureId: FigureId) => void
  projectSession: ReturnType<typeof useProjectSession>
  projectDocument: ReturnType<typeof useHydraulicProjectDocument>
}

export const HydraulicProjectWorkspaceContext =
  createContext<HydraulicProjectWorkspaceValue | null>(null)
