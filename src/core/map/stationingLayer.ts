import type {
  Bounds,
  CenterlineStationLayer,
  CenterlineStationTick,
  FigureSettings,
  MapCoordinate,
} from '../types'
import {
  FRAMES,
  makeMapView as makeView,
  type MapFrame as Frame,
  type MapView as View,
} from './view'
import { stationLabelLayouts } from './stationLabelLayout'

function drawStationTick(
  context: CanvasRenderingContext2D,
  tick: CenterlineStationTick,
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
) {
  const stationing = settings.centerlineStationing
  const useMajor = tick.major && stationing.showMajorTicks
  const useMinor = tick.minor && stationing.showMinorTicks
  if (!useMajor && !useMinor) return

  const [x, y] = view.toScreen(tick.mapPoint.x, tick.mapPoint.y)
  const [tx, ty] = view.toScreen(
    tick.mapPoint.x + tick.mapTangent.x,
    tick.mapPoint.y + tick.mapTangent.y,
  )
  const dx = tx - x
  const dy = ty - y
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const tickLength = useMajor
    ? stationing.majorTickLength
    : stationing.minorTickLength
  const negativeLength =
    stationing.tickSide === 'left'
      ? 0
      : stationing.tickSide === 'both'
        ? tickLength / 2
        : tickLength
  const positiveLength =
    stationing.tickSide === 'right'
      ? 0
      : stationing.tickSide === 'both'
        ? tickLength / 2
        : tickLength

  context.strokeStyle = stationing.tickColor
  context.lineWidth = useMajor
    ? stationing.majorLineWidth
    : stationing.minorLineWidth
  context.beginPath()
  context.moveTo(
    x - normalX * negativeLength,
    y - normalY * negativeLength,
  )
  context.lineTo(
    x + normalX * positiveLength,
    y + normalY * positiveLength,
  )
  context.stroke()

  if (
    layer.selectedLabelId === tick.id &&
    !tick.label
  ) {
    context.fillStyle = '#0877b9'
    context.beginPath()
    context.arc(x, y, 4, 0, Math.PI * 2)
    context.fill()
  }
}

function drawStationingGuides(
  context: CanvasRenderingContext2D,
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
) {
  const stationing = settings.centerlineStationing
  if (stationing.showEndpoints) {
    const endpoints = [
      { label: 'A', point: layer.centerline.mapPoints[0] },
      { label: 'B', point: layer.centerline.mapPoints.at(-1)! },
    ]
    context.save()
    context.font = '700 14px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    for (const endpoint of endpoints) {
      const [x, y] = view.toScreen(endpoint.point.x, endpoint.point.y)
      context.fillStyle = '#ffffff'
      context.strokeStyle = stationing.tickColor
      context.lineWidth = 2
      context.beginPath()
      context.arc(x, y, 12, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      context.fillStyle = stationing.labelColor
      context.fillText(endpoint.label, x, y + 0.5)
    }
    context.restore()
  }

  if (stationing.showDirectionArrow && layer.ticks.length > 0) {
    const tick = layer.ticks[Math.floor(layer.ticks.length / 2)]
    const [x, y] = view.toScreen(tick.mapPoint.x, tick.mapPoint.y)
    const [tx, ty] = view.toScreen(
      tick.mapPoint.x + tick.mapTangent.x,
      tick.mapPoint.y + tick.mapTangent.y,
    )
    const dx = tx - x
    const dy = ty - y
    const length = Math.hypot(dx, dy) || 1
    const ux = dx / length
    const uy = dy / length
    const startX = x - ux * 18
    const startY = y - uy * 18
    const endX = x + ux * 18
    const endY = y + uy * 18
    context.save()
    context.strokeStyle = stationing.tickColor
    context.fillStyle = stationing.tickColor
    context.lineWidth = 3
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(startX, startY)
    context.lineTo(endX, endY)
    context.stroke()
    context.beginPath()
    context.moveTo(endX, endY)
    context.lineTo(endX - ux * 11 - uy * 6, endY - uy * 11 + ux * 6)
    context.lineTo(endX - ux * 11 + uy * 6, endY - uy * 11 - ux * 6)
    context.closePath()
    context.fill()
    context.restore()
  }
}

export function drawCenterlineStationing(
  context: CanvasRenderingContext2D,
  layer: CenterlineStationLayer | undefined,
  view: View,
  settings: FigureSettings,
  frame: Frame,
) {
  const stationing = settings.centerlineStationing
  if (!layer || !stationing.visible) return
  context.save()
  context.lineCap = 'round'
  for (const tick of layer.ticks) {
    drawStationTick(context, tick, layer, view, settings)
  }
  drawStationingGuides(context, layer, view, settings)

  if (stationing.showLabels) {
    context.font = `600 ${stationing.labelFontSize}px Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const layouts = stationLabelLayouts(
      layer,
      view,
      settings,
      frame,
      (text) => context.measureText(text).width,
    )
    for (const layout of layouts) {
      if (layout.moved) {
        context.strokeStyle = stationing.tickColor
        context.lineWidth = Math.max(1, stationing.minorLineWidth)
        context.beginPath()
        context.moveTo(layout.targetX, layout.targetY)
        context.lineTo(layout.labelX, layout.labelY)
        context.stroke()
      }

      context.save()
      context.translate(layout.labelX, layout.labelY)
      context.rotate(layout.angle)
      if (stationing.labelHalo) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.96)'
        context.lineWidth = 5
        context.lineJoin = 'round'
        context.strokeText(layout.text, 0, 0)
      }
      context.fillStyle = stationing.labelColor
      context.fillText(layout.text, 0, 0)
      if (layout.id === layer.selectedLabelId) {
        context.strokeStyle = '#0877b9'
        context.lineWidth = 2
        context.setLineDash([6, 4])
        context.strokeRect(
          -layout.width / 2 - 3,
          -layout.height / 2 - 3,
          layout.width + 6,
          layout.height + 6,
        )
      }
      context.restore()
    }
  }
  context.restore()
}

export type StationLabelHit = {
  id: string
  labelPoint: MapCoordinate
}

export function hitTestStationLabel(
  layer: CenterlineStationLayer | undefined,
  bounds: Bounds,
  settings: FigureSettings,
  x: number,
  y: number,
): StationLabelHit | null {
  if (
    !layer ||
    !settings.centerlineStationing.visible ||
    !settings.centerlineStationing.showLabels
  ) {
    return null
  }
  const frame = FRAMES[settings.orientation]
  const view = makeView(bounds, frame, settings)
  const layouts = stationLabelLayouts(
    layer,
    view,
    settings,
    frame,
    (text) =>
      text.length * settings.centerlineStationing.labelFontSize * 0.62,
  )
  for (let index = layouts.length - 1; index >= 0; index -= 1) {
    const layout = layouts[index]
    const dx = x - layout.labelX
    const dy = y - layout.labelY
    const cosine = Math.cos(-layout.angle)
    const sine = Math.sin(-layout.angle)
    const localX = dx * cosine - dy * sine
    const localY = dx * sine + dy * cosine
    if (
      Math.abs(localX) <= layout.width / 2 + 5 &&
      Math.abs(localY) <= layout.height / 2 + 5
    ) {
      return {
        id: layout.id,
        labelPoint: layout.labelPoint,
      }
    }
  }
  return null
}

export function stationLabelPosition(
  layer: CenterlineStationLayer | undefined,
  bounds: Bounds,
  settings: FigureSettings,
  id: string,
) {
  if (!layer) return null
  const frame = FRAMES[settings.orientation]
  const view = makeView(bounds, frame, settings)
  const layout = stationLabelLayouts(
    layer,
    view,
    settings,
    frame,
    (text) =>
      text.length * settings.centerlineStationing.labelFontSize * 0.62,
  ).find((item) => item.id === id)
  return layout?.labelPoint ?? null
}
