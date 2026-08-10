import type { HydraulicProfileScene } from '../../core/types'
import type { HydraulicLongitudinalScene } from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { renderHydraulicProfileDocument } from './hydraulicProfileRenderer'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import { renderHydraulicLongitudinalDocument } from './hydraulicLongitudinalRenderer'

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

export function downloadHydraulicLongitudinalPng(
  scene: HydraulicLongitudinalScene,
  settings: HydraulicProfileFigureSettings,
) {
  const canvas = document.createElement('canvas')
  renderHydraulicLongitudinalDocument(canvas, { scene, settings })
  const link = document.createElement('a')
  link.download = 'Hydraulic_Longitudinal_Profile.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}
