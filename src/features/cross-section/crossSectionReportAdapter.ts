import type { HydraulicCrossSectionScene, NewReportFigure } from '../../core/types'
import { createCanvasReportFigure } from '../figures/canvasReportFigure'
import { crossSectionFigure } from './crossSectionFigure'

export function createCrossSectionReportFigure(
  canvas: HTMLCanvasElement,
  scene: HydraulicCrossSectionScene,
  baselineLabel: string,
  comparisonLabel: string,
): NewReportFigure {
  const title = `Cross-Section Comparison - ${scene.line.label}`
  return createCanvasReportFigure(canvas, {
    workspaceId: crossSectionFigure.id,
    workspaceLabel: crossSectionFigure.label,
    title,
    caption: `${baselineLabel} and ${comparisonLabel} hydraulic comparison at ${scene.line.label}.`,
  })
}
