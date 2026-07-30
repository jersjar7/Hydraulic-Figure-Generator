import { WseDifferenceWorkspace } from '../wse-difference/WseDifferenceWorkspace'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import { CrossSectionWorkspace } from '../cross-section/CrossSectionWorkspace'
import { crossSectionFigure } from '../cross-section/crossSectionFigure'

export const FIGURE_WORKSPACES = [
  {
    id: wseDifferenceFigure.id,
    figure: wseDifferenceFigure,
    Workspace: WseDifferenceWorkspace,
  },
  {
    id: crossSectionFigure.id,
    figure: crossSectionFigure,
    Workspace: CrossSectionWorkspace,
  },
] as const

export const DEFAULT_FIGURE_WORKSPACE = FIGURE_WORKSPACES[0]
