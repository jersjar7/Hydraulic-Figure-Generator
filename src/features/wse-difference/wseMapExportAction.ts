import type { HydraulicEngine } from '../../core/hydraulicEngine'
import { createWseDifferenceRenderDocument } from '../../core/mapRenderer'
import type {
  AssessmentMapLayer,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapOverlay,
  WseDifferenceScene,
} from '../../core/types'
import { downloadWseDifferencePng } from './exportWseDifference'

type Options = {
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer
  annotations: MapAnnotation[]
  setBusy(busy: boolean): void
  appendNotices(notices: IngestNotice[]): void
}

export function createWseMapExportAction({
  scene,
  engine,
  settings,
  overlays,
  assessment,
  annotations,
  setBusy,
  appendNotices,
}: Options) {
  return async function downloadMap() {
    if (!scene) return
    setBusy(true)
    try {
      await downloadWseDifferencePng({
        document: createWseDifferenceRenderDocument({
          scene,
          commonBounds: engine.commonBounds(),
          settings,
          overlays,
          assessment,
          annotations,
        }),
      })
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Map export failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }
}
