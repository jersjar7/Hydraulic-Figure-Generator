import type { NewReportFigure, WorkspaceDraftSnapshot } from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import {
  renderHydraulicProfileDocument,
  type HydraulicProfileRenderDocument,
} from './hydraulicProfileRenderer'
import type { HydraulicLongitudinalScene } from '../../core/types'
import { renderHydraulicLongitudinalDocument } from './hydraulicLongitudinalRenderer'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'

export function createHydraulicProfileReportFigure(
  document: HydraulicProfileRenderDocument,
  workspaceDraft: WorkspaceDraftSnapshot,
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
    workspaceDraft,
  }
}

export function createHydraulicLongitudinalReportFigure(
  scene: HydraulicLongitudinalScene,
  settings: HydraulicProfileFigureSettings,
  workspaceDraft: WorkspaceDraftSnapshot,
): NewReportFigure {
  const canvas = window.document.createElement('canvas')
  renderHydraulicLongitudinalDocument(canvas, { scene, settings })
  return {
    workspaceId: hydraulicProfileFigure.id,
    workspaceLabel: hydraulicProfileFigure.label,
    title: settings.title,
    caption: `${scene.conditionLabel} longitudinal hydraulic profile.`,
    imageDataUrl: canvas.toDataURL('image/png'),
    widthPx: canvas.width,
    heightPx: canvas.height,
    workspaceDraft,
  }
}
