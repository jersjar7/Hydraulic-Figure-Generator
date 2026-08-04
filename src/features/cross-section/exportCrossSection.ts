import type { HydraulicCrossSectionScene } from '../../core/types'
import { crossSectionFigure } from './crossSectionFigure'
import { renderCrossSectionDocument } from './crossSectionRenderer'
import type { CrossSectionFigureSettings } from './crossSectionSettings'

export function downloadCrossSectionPng(
  scene: HydraulicCrossSectionScene,
  settings: CrossSectionFigureSettings,
) {
  const canvas = document.createElement('canvas')
  renderCrossSectionDocument(canvas, { scene, settings })
  const link = document.createElement('a')
  link.download = crossSectionFigure.exportFileName(scene)
  link.href = canvas.toDataURL('image/png')
  link.click()
}
