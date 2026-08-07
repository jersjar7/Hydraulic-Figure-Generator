import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from '../cross-section/crossSectionFigure'
import { defineFigureWorkspace } from './workspaceModule'
import { planViewResultFigure } from '../plan-view-results/planViewResultFigure'
import { hydraulicProfileFigure } from '../hydraulic-profiles/hydraulicProfileFigure'

export const FIGURE_WORKSPACES = [
  defineFigureWorkspace(
    wseDifferenceFigure,
    () =>
      import('../wse-difference/wseWorkspaceDraft').then(
        (module) => module.wseWorkspaceDraft,
      ),
    () =>
      import('../wse-difference/WseDifferenceWorkspace').then((module) => ({
        default: module.WseDifferenceWorkspace,
      })),
  ),
  defineFigureWorkspace(
    crossSectionFigure,
    () =>
      import('../cross-section/crossSectionWorkspaceDraft').then(
        (module) => module.crossSectionWorkspaceDraft,
      ),
    () =>
      import('../cross-section/CrossSectionWorkspace').then((module) => ({
        default: module.CrossSectionWorkspace,
      })),
  ),
  defineFigureWorkspace(
    planViewResultFigure,
    () =>
      import('../plan-view-results/planViewResultWorkspaceDraft').then(
        (module) => module.planViewResultWorkspaceDraft,
      ),
    () =>
      import('../plan-view-results/PlanViewResultWorkspace').then((module) => ({
        default: module.PlanViewResultWorkspace,
      })),
  ),
  defineFigureWorkspace(
    hydraulicProfileFigure,
    () =>
      import('../hydraulic-profiles/hydraulicProfileWorkspaceDraft').then(
        (module) => module.hydraulicProfileWorkspaceDraft,
      ),
    () =>
      import('../hydraulic-profiles/HydraulicProfilesWorkspace').then((module) => ({
        default: module.HydraulicProfilesWorkspace,
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
