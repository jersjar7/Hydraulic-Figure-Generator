import type { RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineStationLayer,
  IngestNotice,
  MapAnnotation,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
  WorkspaceDraftSnapshot,
} from '../../core/types'
import { createCanvasReportFigure } from '../figures/canvasReportFigure'
import { exportPlanViewResult } from './exportPlanViewResult'
import { planViewResultFigure } from './planViewResultFigure'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: PlanViewResultScene | null
  engine: HydraulicEngine
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing: CenterlineStationLayer[]
  annotations: MapAnnotation[]
  captureDraft(): WorkspaceDraftSnapshot
  appendNotices(notices: IngestNotice[]): void
}

export function createPlanViewWorkspaceOutputController({
  canvasRef,
  scene,
  engine,
  settings,
  overlays,
  centerlineStationing,
  annotations,
  captureDraft,
  appendNotices,
}: Options) {
  const download = () => {
    if (!scene) return
    void exportPlanViewResult({
      scene,
      engine,
      settings,
      overlays,
      centerlineStationing,
      annotations,
      appendNotices,
    })
  }

  const createExportFigure = () => {
    if (!scene || !canvasRef.current) return null
    const title = `${scene.condition.label} - ${scene.result.label}`
    const run = scene.selection ? ` for ${scene.selection.run.name}` : ''
    return createCanvasReportFigure(canvasRef.current, {
      workspaceId: planViewResultFigure.id,
      workspaceLabel: planViewResultFigure.label,
      title,
      caption: `${scene.result.label}${run}, ${scene.condition.label}.`,
      workspaceDraft: captureDraft(),
    })
  }

  return { download, createExportFigure }
}
