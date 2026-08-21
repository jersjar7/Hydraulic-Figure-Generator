import { runDisplayName } from '../hydraulicEngine'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureRenderDocument,
  MapElementBounds,
  MapOverlay,
  MapAnnotation,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../types'
import { drawBasemap } from './basemapLayer'
import {
  drawAnnotations,
  drawAnnotationSelection,
} from './annotationLayer'
import {
  drawContourLevels,
  drawMeshElements,
  fillScalarBands,
  localCoordinates,
} from './hydraulicLayers'
import { drawNorthArrow } from './northArrowElement'
import { drawOverlays } from './overlayLayer'
import { drawScaleBar } from './scaleBarElement'
import { drawCenterlineStationing } from './stationingLayer'
import { scalarColor } from './scalarResultRamp'
import { drawScalarResultLegend } from './scalarResultLegendElement'
import {
  resolveScalarResultScale,
  scalarContourLevels,
} from './scalarResultScale'
import { drawTitle } from './titleElement'
import { drawMapElementSelection } from './mapElementLayout'
import { FRAMES, makeMapView } from './view'
import { drawVelocityVectors } from './velocityVectorLayer'

export type PlanViewResultRenderDocument = FigureRenderDocument<
  PlanViewResultScene,
  PlanViewResultSettings,
  Bounds,
  {
    overlays: MapOverlay[]
    centerlineStationing: CenterlineStationLayer[]
    annotations: MapAnnotation[]
  },
  {
    selectedAnnotationId: string | null
    selectedElementKey: MapElementBounds['key'] | null
  }
>

export function resolvePlanViewTitle(
  scene: PlanViewResultScene,
  template: string,
) {
  const title = template.trim() || '{run} - {parameter} ({units})'
  return title
    .replaceAll(
      '{run}',
      scene.selection ? runDisplayName(scene.selection.run.name) : '',
    )
    .replaceAll('{condition}', scene.condition.label)
    .replaceAll('{parameter}', scene.result.label)
    .replaceAll('{units}', scene.result.units)
    .replace(/\(\s*\)/g, '')
    .replace(/:\s*-/g, ' -')
    .replace(/-\s*-/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function renderPlanViewResultDocument(
  canvas: HTMLCanvasElement,
  document: PlanViewResultRenderDocument,
  signal?: AbortSignal,
) {
  const { scene } = document
  const { bounds, settings } = document.view
  const frame = FRAMES[settings.orientation]
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create the map canvas.')
  const view = makeMapView(bounds, frame, settings)
  const scale = resolveScalarResultScale(scene, settings)
  const showsSurface = scene.outputKind !== 'mesh-elements'
  const showsMesh =
    scene.outputKind === 'mesh-elements' ||
    scene.outputKind === 'topography-mesh-elements'
  const elementBounds: MapElementBounds[] = []

  context.fillStyle = '#dce4ec'
  context.fillRect(0, 0, frame.width, frame.height)
  await drawBasemap(context, view, settings.basemapOpacity, signal)
  if (signal?.aborted) throw new DOMException('Rendering was cancelled.', 'AbortError')

  const { localX, localY } = localCoordinates(scene.projected, view)
  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
  if (showsSurface) {
    fillScalarBands(
      context,
      localX,
      localY,
      scene.projected.tris,
      scene.values,
      scale.minimum,
      scale.maximum,
      scale.bandCount,
      (value) =>
        scalarColor(
          settings.ramp,
          value,
          scale.minimum,
          scale.maximum,
        ),
    )
  }
  if (showsSurface && settings.showContours) {
    drawContourLevels(
      context,
      localX,
      localY,
      scene.projected.tris,
      scene.values,
      scalarContourLevels(
        scale.minimum,
        scale.maximum,
        settings.contourInterval,
        scale.interval,
      ),
      {
        color: settings.contourColor,
        width: settings.contourWidth,
        pattern: settings.contourPattern,
      },
    )
  }
  if (showsMesh) {
    drawMeshElements(
      context,
      localX,
      localY,
      scene.projected.tris,
      {
        color: settings.meshLineColor,
        width: settings.meshLineWidth,
        opacity: settings.meshLineOpacity,
        pattern: settings.meshLinePattern,
      },
    )
  }
  if (scene.velocityVectors) {
    drawVelocityVectors(
      context,
      localX,
      localY,
      scene.velocityVectors,
      settings.velocityVectors,
      settings.dryDepth,
    )
  }
  if (settings.showOverlays) {
    drawOverlays(context, document.layers.overlays, view)
  }
  context.restore()

  for (const layer of document.layers.centerlineStationing ?? []) {
    drawCenterlineStationing(context, layer, view, settings, frame)
  }
  const annotations = document.layers.annotations ?? []
  drawAnnotations(context, annotations, view)
  const selectedAnnotation = annotations.find(
    (annotation) =>
      annotation.id === document.selection?.selectedAnnotationId,
  )
  if (selectedAnnotation) {
    drawAnnotationSelection(context, selectedAnnotation, view)
  }

  if (settings.showTitle) {
    elementBounds.push(
      drawTitle(
        context,
        resolvePlanViewTitle(scene, settings.titleTemplate),
        frame,
        settings.elementPositions.title,
        settings.elementStyles.title,
      ),
    )
  }
  if (settings.showLegend && showsSurface) {
    elementBounds.push(
      drawScalarResultLegend(
        context,
        {
          ...scale,
          ramp: settings.ramp,
          title: settings.elementStyles.diffLegend.title || scene.result.label,
          units: settings.elementStyles.diffLegend.units || scene.result.units,
        },
        frame,
        settings.elementPositions.diffLegend,
        settings.elementStyles.diffLegend,
      ),
    )
  }
  if (settings.showNorth) {
    elementBounds.push(
      drawNorthArrow(
        context,
        frame,
        view.rotationRadians,
        settings.elementPositions.north,
        settings.elementStyles.north,
      ),
    )
  }
  if (settings.showScale) {
    elementBounds.push(
      drawScaleBar(
        context,
        frame,
        scene.projected.ftPerMerc / view.scale,
        settings.elementPositions.scale,
        settings.elementStyles.scale,
      ),
    )
  }
  const selectedElement = elementBounds.find(
    (element) => element.key === document.selection?.selectedElementKey,
  )
  if (selectedElement) drawMapElementSelection(context, selectedElement)
  return elementBounds
}
