import type {
  AssessmentMapLayer,
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  WseAssessmentLine,
  WseDifferenceScene,
} from './types'
import {
  drawAnnotations,
  drawAnnotationSelection,
} from './map/annotationLayer'
import {
  drawAssessmentCallouts,
  drawAssessmentLines,
  drawAssessmentReviewMarkers,
  drawAssessmentSelection,
  normalizeAssessmentMapLayer,
} from './map/assessmentLayer'
import { drawBasemap } from './map/basemapLayer'
import { drawDifferenceLegend } from './map/differenceLegendElement'
import { drawOverlays } from './map/overlayLayer'
import { drawCenterlineStationing } from './map/stationingLayer'
import {
  differenceBreaks,
  drawContourLevels,
  drawValidBoundary,
  fillDifferenceBands,
  fillWetDry,
  localCoordinates,
} from './map/hydraulicLayers'
import { drawMapElementSelection } from './map/mapElementLayout'
import { drawNorthArrow } from './map/northArrowElement'
import { drawScaleBar } from './map/scaleBarElement'
import { drawTitle, resolveTitle } from './map/titleElement'
import { drawWetDryKey } from './map/wetDryKeyElement'
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

export async function renderWseDifferenceMap(
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

  context.clearRect(0, 0, frame.width, frame.height)
  context.fillStyle = '#dce4ec'
  context.fillRect(0, 0, frame.width, frame.height)
  await drawBasemap(context, view, settings.basemapOpacity, signal)

  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  const existingCoordinates = localCoordinates(scene.projected, view)
  fillDifferenceBands(
    context,
    existingCoordinates.localX,
    existingCoordinates.localY,
    scene.projected.tris,
    scene.diff,
    legendBound,
    settings.legendInterval,
  )

  const proposedCoordinates = localCoordinates(scene.proposedProjected, view)
  if (settings.showWetDry) {
    fillWetDry(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.wetDry,
      settings,
    )
    fillWetDry(
      context,
      proposedCoordinates.localX,
      proposedCoordinates.localY,
      scene.proposedProjected.tris,
      scene.proposedWetDry,
      settings,
    )
  }
  if (settings.showDifferenceOutlines) {
    drawContourLevels(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      differenceBreaks(legendBound, settings.legendInterval),
      settings.differenceOutlineColor,
    )
    drawValidBoundary(
      context,
      existingCoordinates.localX,
      existingCoordinates.localY,
      scene.projected.tris,
      scene.diff,
      settings.differenceOutlineColor,
    )
  }
  if (settings.showAssessmentLines) {
    drawAssessmentLines(
      context,
      assessmentLayer.lines,
      view,
      settings.assessmentLineColor,
      settings.assessmentLineWidth,
    )
    drawAssessmentSelection(
      context,
      assessmentLayer.selectedLine,
      view,
      settings.assessmentLineWidth,
    )
  }
  if (settings.showOverlays) drawOverlays(context, overlays, view)
  context.restore()

  drawCenterlineStationing(
    context,
    assessmentLayer.centerlineStationing,
    view,
    settings,
    frame,
  )
  if (settings.showAssessmentLines) {
    drawAssessmentCallouts(
      context,
      assessmentLayer,
      view,
      settings,
      frame,
    )
    drawAssessmentReviewMarkers(context, assessmentLayer, view)
  }
  drawAnnotations(context, annotations, view)
  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId,
  )
  if (selectedAnnotation) {
    drawAnnotationSelection(context, selectedAnnotation, view)
  }

  const positions = settings.elementPositions
  const styles = settings.elementStyles
  const elementBounds: MapElementBounds[] = []
  if (settings.showTitle) {
    elementBounds.push(
      drawTitle(
        context,
        resolveTitle(scene, settings.titleTemplate),
        frame,
        positions.title,
        styles.title,
      ),
    )
  }
  if (settings.showLegend) {
    elementBounds.push(
      drawDifferenceLegend(
        context,
        legendBound,
        settings.legendInterval,
        frame,
        positions.diffLegend,
        styles.diffLegend,
      ),
    )
  }
  if (settings.showNorth) {
    elementBounds.push(
      drawNorthArrow(
        context,
        frame,
        view.rotationRadians,
        positions.north,
        styles.north,
      ),
    )
  }
  if (settings.showScale) {
    elementBounds.push(
      drawScaleBar(
        context,
        frame,
        scene.projected.ftPerMerc / view.scale,
        positions.scale,
        styles.scale,
      ),
    )
  }
  if (settings.showWetDry && settings.showWetDryKey) {
    elementBounds.push(
      drawWetDryKey(
        context,
        frame,
        settings,
        positions.wetDry,
        styles.wetDry,
      ),
    )
  }
  const selectedElement = elementBounds.find(
    (bounds) => bounds.key === selectedElementKey,
  )
  if (selectedElement) {
    drawMapElementSelection(context, selectedElement)
  }
  return elementBounds
}
