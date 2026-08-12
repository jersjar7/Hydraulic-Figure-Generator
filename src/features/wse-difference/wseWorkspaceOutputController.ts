import type { RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  AssessmentMapLayer,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapOverlay,
  WorkspaceDraftSnapshot,
  WseDifferenceScene,
} from '../../core/types'
import { createWseMapExportAction } from './wseMapExportAction'
import { createWseReportFigure } from './wseReportAdapter'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer
  annotations: MapAnnotation[]
  captureDraft(): WorkspaceDraftSnapshot
  setBusy(busy: boolean): void
  appendNotices(notices: IngestNotice[]): void
}

export function createWseWorkspaceOutputController({
  canvasRef,
  scene,
  engine,
  settings,
  overlays,
  assessment,
  annotations,
  captureDraft,
  setBusy,
  appendNotices,
}: Options) {
  const downloadMap = createWseMapExportAction({
    scene,
    engine,
    settings,
    overlays,
    assessment,
    annotations,
    setBusy,
    appendNotices,
  })
  const createExportFigure = () => {
    if (!scene || !canvasRef.current) return null
    return createWseReportFigure(
      canvasRef.current,
      scene,
      captureDraft(),
    )
  }

  return { downloadMap, createExportFigure }
}
