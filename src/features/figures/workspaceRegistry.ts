import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from '../cross-section/crossSectionFigure'
import { defineFigureWorkspace } from './workspaceModule'

export const FIGURE_WORKSPACES = [
  defineFigureWorkspace(
    wseDifferenceFigure,
    () =>
      import('../wse-difference/WseDifferenceWorkspace').then((module) => ({
        default: module.WseDifferenceWorkspace,
      })),
  ),
  defineFigureWorkspace(
    crossSectionFigure,
    () =>
      import('../cross-section/CrossSectionWorkspace').then((module) => ({
        default: module.CrossSectionWorkspace,
      })),
  ),
] as const

export const DEFAULT_FIGURE_WORKSPACE = FIGURE_WORKSPACES[0]

export const FIGURE_MODULES = FIGURE_WORKSPACES.map(
  (workspace) => workspace.figure,
)

export const DEFAULT_FIGURE_MODULE = DEFAULT_FIGURE_WORKSPACE.figure

export type FigureId = (typeof FIGURE_WORKSPACES)[number]['id']

export function figureWorkspaceById(id: string) {
  return FIGURE_WORKSPACES.find((workspace) => workspace.id === id) ?? null
}

export function figureModuleById(id: string) {
  return figureWorkspaceById(id)?.figure ?? null
}
