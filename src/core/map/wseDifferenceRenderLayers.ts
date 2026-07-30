import type {
  AssessmentMapLayer,
  FigureSettings,
  MapAnnotation,
  MapElementBounds,
  MapElementKey,
  MapOverlay,
  WseDifferenceScene,
} from '../types'
import {
  drawAnnotations,
  drawAnnotationSelection,
} from './annotationLayer'
import {
  drawAssessmentCallouts,
  drawAssessmentLines,
  drawAssessmentReviewMarkers,
  drawAssessmentSelection,
} from './assessmentLayer'
import { drawBasemap } from './basemapLayer'
import { drawDifferenceLegend } from './differenceLegendElement'
import {
  differenceBreaks,
  drawContourLevels,
  drawValidBoundary,
  fillDifferenceBands,
  fillWetDry,
  localCoordinates,
} from './hydraulicLayers'
import { drawMapElementSelection } from './mapElementLayout'
import { drawNorthArrow } from './northArrowElement'
import { drawOverlays } from './overlayLayer'
import {
  executeRenderLayers,
  type FigureRenderLayer,
} from './renderPipeline'
import { drawScaleBar } from './scaleBarElement'
import { drawCenterlineStationing } from './stationingLayer'
import { drawTitle, resolveTitle } from './titleElement'
import type { MapFrame, MapView } from './view'
import { drawWetDryKey } from './wetDryKeyElement'

export type WseDifferenceLayerContext = {
  context: CanvasRenderingContext2D
  scene: WseDifferenceScene
  settings: FigureSettings
  frame: MapFrame
  view: MapView
  overlays: MapOverlay[]
  assessment: AssessmentMapLayer
  annotations: MapAnnotation[]
  selectedAnnotationId: string | null
  selectedElementKey: MapElementKey | null
  legendBound: number
  elementBounds: MapElementBounds[]
  signal?: AbortSignal
}

function withMapTransform(
  renderContext: WseDifferenceLayerContext,
  draw: () => void,
) {
  const { context, view } = renderContext
  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  draw()
  context.restore()
}

export const WSE_DIFFERENCE_RENDER_LAYERS: readonly FigureRenderLayer<WseDifferenceLayerContext>[] =
  [
    {
      id: 'basemap',
      async render({ context, frame, settings, view, signal }) {
        context.clearRect(0, 0, frame.width, frame.height)
        context.fillStyle = '#dce4ec'
        context.fillRect(0, 0, frame.width, frame.height)
        await drawBasemap(
          context,
          view,
          settings.basemapOpacity,
          signal,
        )
      },
    },
    {
      id: 'difference-bands',
      render(renderContext) {
        const { context, scene, view, settings, legendBound } =
          renderContext
        withMapTransform(renderContext, () => {
          const coordinates = localCoordinates(scene.projected, view)
          fillDifferenceBands(
            context,
            coordinates.localX,
            coordinates.localY,
            scene.projected.tris,
            scene.diff,
            legendBound,
            settings.legendInterval,
          )
        })
      },
    },
    {
      id: 'wet-dry',
      render(renderContext) {
        const { context, scene, view, settings } = renderContext
        if (!settings.showWetDry) return
        withMapTransform(renderContext, () => {
          const existing = localCoordinates(scene.projected, view)
          const proposed = localCoordinates(scene.proposedProjected, view)
          fillWetDry(
            context,
            existing.localX,
            existing.localY,
            scene.projected.tris,
            scene.wetDry,
            settings,
          )
          fillWetDry(
            context,
            proposed.localX,
            proposed.localY,
            scene.proposedProjected.tris,
            scene.proposedWetDry,
            settings,
          )
        })
      },
    },
    {
      id: 'difference-outlines',
      render(renderContext) {
        const { context, scene, view, settings, legendBound } =
          renderContext
        if (!settings.showDifferenceOutlines) return
        withMapTransform(renderContext, () => {
          const coordinates = localCoordinates(scene.projected, view)
          drawContourLevels(
            context,
            coordinates.localX,
            coordinates.localY,
            scene.projected.tris,
            scene.diff,
            differenceBreaks(legendBound, settings.legendInterval),
            settings.differenceOutlineColor,
          )
          drawValidBoundary(
            context,
            coordinates.localX,
            coordinates.localY,
            scene.projected.tris,
            scene.diff,
            settings.differenceOutlineColor,
          )
        })
      },
    },
    {
      id: 'assessment-lines',
      render(renderContext) {
        const { context, assessment, view, settings } = renderContext
        if (!settings.showAssessmentLines) return
        withMapTransform(renderContext, () => {
          drawAssessmentLines(
            context,
            assessment.lines,
            view,
            settings.assessmentLineColor,
            settings.assessmentLineWidth,
          )
          drawAssessmentSelection(
            context,
            assessment.selectedLine,
            view,
            settings.assessmentLineWidth,
          )
        })
      },
    },
    {
      id: 'overlays',
      render(renderContext) {
        const { context, overlays, view, settings } = renderContext
        if (!settings.showOverlays) return
        withMapTransform(renderContext, () => {
          drawOverlays(context, overlays, view)
        })
      },
    },
    {
      id: 'stationing',
      render({ context, assessment, view, settings, frame }) {
        drawCenterlineStationing(
          context,
          assessment.centerlineStationing,
          view,
          settings,
          frame,
        )
      },
    },
    {
      id: 'assessment-callouts',
      render({ context, assessment, view, settings, frame }) {
        if (!settings.showAssessmentLines) return
        drawAssessmentCallouts(context, assessment, view, settings, frame)
        drawAssessmentReviewMarkers(context, assessment, view)
      },
    },
    {
      id: 'annotations',
      render({
        context,
        annotations,
        view,
        selectedAnnotationId,
      }) {
        drawAnnotations(context, annotations, view)
        const selected = annotations.find(
          (annotation) => annotation.id === selectedAnnotationId,
        )
        if (selected) drawAnnotationSelection(context, selected, view)
      },
    },
    {
      id: 'figure-elements',
      render(renderContext) {
        const {
          context,
          scene,
          settings,
          frame,
          view,
          legendBound,
          selectedElementKey,
          elementBounds,
        } = renderContext
        const positions = settings.elementPositions
        const styles = settings.elementStyles
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
        const selected = elementBounds.find(
          (bounds) => bounds.key === selectedElementKey,
        )
        if (selected) drawMapElementSelection(context, selected)
      },
    },
  ]

export function renderWseDifferenceLayers(
  context: WseDifferenceLayerContext,
) {
  return executeRenderLayers(
    WSE_DIFFERENCE_RENDER_LAYERS,
    context,
    context.signal,
  )
}
