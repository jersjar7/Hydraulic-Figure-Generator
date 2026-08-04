import { runDisplayName } from '../hydraulicEngine'
import type {
  Bounds,
  FigureRenderDocument,
  MapElementBounds,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../types'
import { drawBasemap } from './basemapLayer'
import {
  drawContourLevels,
  fillScalarBands,
  localCoordinates,
} from './hydraulicLayers'
import { drawNorthArrow } from './northArrowElement'
import { drawOverlays } from './overlayLayer'
import { drawScaleBar } from './scaleBarElement'
import { scalarColor } from './scalarResultRamp'
import { drawScalarResultLegend } from './scalarResultLegendElement'
import {
  resolveScalarResultScale,
  scalarContourLevels,
} from './scalarResultScale'
import { drawTitle } from './titleElement'
import { FRAMES, makeMapView } from './view'

export type PlanViewResultRenderDocument = FigureRenderDocument<
  PlanViewResultScene,
  PlanViewResultSettings,
  Bounds,
  { overlays: MapOverlay[] },
  Record<string, never>
>

export function resolvePlanViewTitle(
  scene: PlanViewResultScene,
  template: string,
) {
  const title = template.trim() || '{run} - {parameter} ({units})'
  return title
    .replaceAll('{run}', runDisplayName(scene.selection.run.name))
    .replaceAll('{condition}', scene.selection.condition.label)
    .replaceAll('{parameter}', scene.result.label)
    .replaceAll('{units}', scene.result.units)
    .replace(/\(\s*\)/g, '')
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
  const elementBounds: MapElementBounds[] = []

  context.fillStyle = '#dce4ec'
  context.fillRect(0, 0, frame.width, frame.height)
  await drawBasemap(context, view, settings.basemapOpacity, signal)
  if (signal?.aborted) throw new DOMException('Rendering was cancelled.', 'AbortError')

  const { localX, localY } = localCoordinates(scene.projected, view)
  context.save()
  context.translate(view.originX, view.originY)
  context.rotate(view.rotationRadians)
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
  if (settings.showContours) {
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
      settings.contourColor,
      settings.contourWidth,
    )
  }
  if (settings.showOverlays) {
    drawOverlays(context, document.layers.overlays, view)
  }
  context.restore()

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
  if (settings.showLegend) {
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
  return elementBounds
}
