import { WseDifferenceWorkspace } from '../wse-difference/WseDifferenceWorkspace'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'

export const FIGURE_WORKSPACES = [
  {
    id: wseDifferenceFigure.id,
    figure: wseDifferenceFigure,
    Workspace: WseDifferenceWorkspace,
  },
] as const

export const DEFAULT_FIGURE_WORKSPACE = FIGURE_WORKSPACES[0]
