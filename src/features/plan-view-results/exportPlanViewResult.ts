import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  IngestNotice,
  CenterlineStationLayer,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import { planViewResultFigure } from './planViewResultFigure'
import { createPlanViewResultRenderDocument } from './planViewResultRenderDocument'

type Options = {
  scene: PlanViewResultScene
  engine: HydraulicEngine
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing?: CenterlineStationLayer[]
  appendNotices(notices: IngestNotice[]): void
}

export async function exportPlanViewResult({
  scene,
  engine,
  settings,
  overlays,
  centerlineStationing,
  appendNotices,
}: Options) {
  try {
    const canvas = document.createElement('canvas')
    await planViewResultFigure.render({
      canvas,
      document: createPlanViewResultRenderDocument({
        engine,
        scene,
        settings,
        overlays,
        centerlineStationing,
        mode: 'published',
      }),
    })
    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = planViewResultFigure.exportFileName(scene)
    anchor.click()
  } catch (error) {
    appendNotices([{
      level: 'error',
      text: `Map export failed: ${error instanceof Error ? error.message : String(error)}`,
    }])
  }
}
