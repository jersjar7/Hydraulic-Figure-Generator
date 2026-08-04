import type { HydraulicProfileScene } from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { renderHydraulicProfileDocument } from './hydraulicProfileRenderer'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'

export function downloadHydraulicProfilePng(
  scene: HydraulicProfileScene,
  settings: HydraulicProfileFigureSettings,
) {
  const canvas = document.createElement('canvas')
  renderHydraulicProfileDocument(canvas, { scene, settings })
  const link = document.createElement('a')
  link.download = hydraulicProfileFigure.exportFileName(scene)
  link.href = canvas.toDataURL('image/png')
  link.click()
}
