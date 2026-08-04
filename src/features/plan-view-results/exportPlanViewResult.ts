import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  IngestNotice,
  CenterlineStationLayer,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import { planViewResultFigure } from './planViewResultFigure'

type Options = {
  scene: PlanViewResultScene
  engine: HydraulicEngine
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing?: CenterlineStationLayer
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
      document: {
        scene,
        view: {
          bounds: engine.commonBounds([scene.condition.key]),
          settings,
        },
        layers: {
          overlays,
          centerlineStationing: centerlineStationing
            ? { ...centerlineStationing, selectedLabelId: null }
            : undefined,
        },
        selection: {},
      },
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
