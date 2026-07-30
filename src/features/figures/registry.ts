import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from '../cross-section/crossSectionFigure'

export const FIGURE_MODULES = [
  wseDifferenceFigure,
  crossSectionFigure,
] as const

export const DEFAULT_FIGURE_MODULE = wseDifferenceFigure

export function figureModuleById(id: string) {
  return FIGURE_MODULES.find((figure) => figure.id === id) ?? null
}
