import type {
  AssessmentMapLayer,
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  FigureRenderDocument,
  WseAssessmentLine,
  WseDifferenceScene,
} from './types'
import {
  normalizeAssessmentMapLayer,
} from './map/assessmentLayer'
import { renderWseDifferenceLayers } from './map/wseDifferenceRenderLayers'
import { FRAMES, makeMapView as makeView } from './map/view'

export {
  duplicateAnnotation,
  moveAnnotationPoints,
  type AnnotationHitPart,
} from './map/annotationGeometry'
export { hitTestAnnotation } from './map/annotationLayer'
export {
  formatHydraulicResultLabel,
  sampleHydraulicResult,
  type HydraulicResultSample,
} from './map/hydraulicSampling'
export {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  FRAMES,
  mapPointToCanvas,
} from './map/view'
export {
  hitTestAssessmentCallout,
  type AssessmentCalloutHit,
} from './map/assessmentLayer'
export {
  hitTestStationLabel,
  stationLabelPosition,
  type StationLabelHit,
} from './map/stationingLayer'

export type WseDifferenceRenderLayers = {
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer | WseAssessmentLine[]
  annotations: MapAnnotation[]
}

export type WseDifferenceRenderSelection = {
  annotationId: string | null
  elementKey: MapElementKey | null
}

export type WseDifferenceRenderDocument = FigureRenderDocument<
  WseDifferenceScene,
  FigureSettings,
  Bounds,
  WseDifferenceRenderLayers,
  WseDifferenceRenderSelection
>

export type CreateWseDifferenceRenderDocumentOptions = {
  scene: WseDifferenceScene,
  commonBounds: Bounds,
  settings: FigureSettings,
  overlays?: MapOverlay[]
  assessment?: AssessmentMapLayer | WseAssessmentLine[]
  annotations?: MapAnnotation[]
  selectedAnnotationId?: string | null
  selectedElementKey?: MapElementKey | null
}

export function createWseDifferenceRenderDocument({
  scene,
  commonBounds,
  settings,
  overlays = [],
  assessment = [],
  annotations = [],
  selectedAnnotationId = null,
  selectedElementKey = null,
}: CreateWseDifferenceRenderDocumentOptions): WseDifferenceRenderDocument {
  return {
    scene,
    view: {
      bounds: commonBounds,
      settings,
    },
    layers: {
      overlays,
      assessment,
      annotations,
    },
    selection: {
      annotationId: selectedAnnotationId,
      elementKey: selectedElementKey,
    },
  }
}

export async function renderWseDifferenceDocument(
  canvas: HTMLCanvasElement,
  document: WseDifferenceRenderDocument,
  signal?: AbortSignal,
) {
  const { scene } = document
  const { bounds: commonBounds, settings } = document.view
  const {
    overlays,
    assessment: assessmentInput,
    annotations,
  } = document.layers
  const {
    annotationId: selectedAnnotationId,
    elementKey: selectedElementKey,
  } = document.selection
  const frame = FRAMES[settings.orientation]
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create the map canvas.')
  const view = makeView(commonBounds, frame, settings)
  const assessmentLayer = normalizeAssessmentMapLayer(assessmentInput)
  const legendBound =
    settings.legendBound && settings.legendBound > 0
      ? settings.legendBound
      : scene.maxAbs

  const elementBounds: MapElementBounds[] = []
  await renderWseDifferenceLayers({
    context,
    scene,
    settings,
    frame,
    view,
    overlays,
    assessment: assessmentLayer,
    annotations,
    selectedAnnotationId,
    selectedElementKey,
    legendBound,
    elementBounds,
    signal,
  })
  return elementBounds
}

export function renderWseDifferenceMap(
  canvas: HTMLCanvasElement,
  scene: WseDifferenceScene,
  commonBounds: Bounds,
  settings: FigureSettings,
  overlays: MapOverlay[],
  assessmentInput: AssessmentMapLayer | WseAssessmentLine[] = [],
  annotations: MapAnnotation[] = [],
  selectedAnnotationId: string | null = null,
  selectedElementKey: MapElementKey | null = null,
  signal?: AbortSignal,
) {
  return renderWseDifferenceDocument(
    canvas,
    createWseDifferenceRenderDocument({
      scene,
      commonBounds,
      settings,
      overlays,
      assessment: assessmentInput,
      annotations,
      selectedAnnotationId,
      selectedElementKey,
    }),
    signal,
  )
}
