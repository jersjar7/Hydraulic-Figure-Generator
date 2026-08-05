import type { NewReportFigure } from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import {
  renderHydraulicProfileDocument,
  type HydraulicProfileRenderDocument,
} from './hydraulicProfileRenderer'

export function createHydraulicProfileReportFigure(
  document: HydraulicProfileRenderDocument,
): NewReportFigure {
  const canvas = window.document.createElement('canvas')
  renderHydraulicProfileDocument(canvas, document)
  const station = document.scene.section.stationLabel
  return {
    workspaceId: hydraulicProfileFigure.id,
    workspaceLabel: hydraulicProfileFigure.label,
    title: `${document.settings.title} - Station ${station}`,
    caption: `${document.scene.conditionLabel} hydraulic cross section at Station ${station}.`,
    imageDataUrl: canvas.toDataURL('image/png'),
    widthPx: canvas.width,
    heightPx: canvas.height,
  }
}
