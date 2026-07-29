import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'

export const FIGURE_MODULES = [wseDifferenceFigure] as const

export const DEFAULT_FIGURE_MODULE = wseDifferenceFigure

export function figureModuleById(id: string) {
  return FIGURE_MODULES.find((figure) => figure.id === id) ?? null
}
