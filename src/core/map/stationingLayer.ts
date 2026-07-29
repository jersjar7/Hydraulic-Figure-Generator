import { formatStation } from '../centerlineStationing'
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
type StationLabelLayout = {
  id: string
  text: string
  targetX: number
  targetY: number
  labelX: number
  labelY: number
  labelPoint: MapCoordinate
  width: number
  height: number
  angle: number
  collisionBox: {
    x: number
    y: number
    width: number
    height: number
  }
  moved: boolean
}

function normalizedTextAngle(angle: number) {
  let result = angle
  while (result > Math.PI) result -= Math.PI * 2
  while (result < -Math.PI) result += Math.PI * 2
  if (result > Math.PI / 2) result -= Math.PI
  if (result < -Math.PI / 2) result += Math.PI
  return result
}

function stationLabelText(
  tick: CenterlineStationTick,
  settings: FigureSettings,
) {
  const override = settings.centerlineStationing.overrides[tick.id]
  return (
    override?.text ??
    `${settings.centerlineStationing.prefix}${formatStation(
      tick.stationFeet,
      settings.centerlineStationing.decimalPlaces,
    )}`
  )
}

function stationLabelLayouts(
  layer: CenterlineStationLayer,
  view: View,
  settings: FigureSettings,
  frame: Frame,
  measureText: (text: string) => number,
) {
  const stationing = settings.centerlineStationing
  const layouts: StationLabelLayout[] = []
  const placedBoxes: StationLabelLayout['collisionBox'][] = []

  layer.ticks
    .filter(
      (tick) =>
        tick.label &&
        stationing.overrides[tick.id]?.visible !== false,
    )
    .forEach((tick, index) => {
      const [targetX, targetY] = view.toScreen(
        tick.mapPoint.x,
        tick.mapPoint.y,
      )
      const [tangentX, tangentY] = view.toScreen(
        tick.mapPoint.x + tick.mapTangent.x,
        tick.mapPoint.y + tick.mapTangent.y,
      )
      const dx = tangentX - targetX
      const dy = tangentY - targetY
      const tangentLength = Math.hypot(dx, dy) || 1
      const normalX = -dy / tangentLength
      const normalY = dx / tangentLength
      const text = stationLabelText(tick, settings)
      const width = measureText(text) + 8
      const height = stationing.labelFontSize + 8
      const angle =
        stationing.labelOrientation === 'aligned'
          ? normalizedTextAngle(Math.atan2(dy, dx))
          : 0
      const rotatedWidth =
        Math.abs(Math.cos(angle)) * width +
        Math.abs(Math.sin(angle)) * height
      const rotatedHeight =
        Math.abs(Math.sin(angle)) * width +
        Math.abs(Math.cos(angle)) * height
      const override = stationing.overrides[tick.id]
      let labelX = targetX
      let labelY = targetY
      let collisionBox = {
        x: targetX - rotatedWidth / 2,
        y: targetY - rotatedHeight / 2,
        width: rotatedWidth,
        height: rotatedHeight,
      }

      if (override?.labelPoint) {
        ;[labelX, labelY] = view.toScreen(
          override.labelPoint.x,
          override.labelPoint.y,
        )
        collisionBox = {
          x: labelX - rotatedWidth / 2,
          y: labelY - rotatedHeight / 2,
          width: rotatedWidth,
          height: rotatedHeight,
        }
      } else {
        const preferredSide =
          stationing.labelSide === 'left'
            ? 1
            : stationing.labelSide === 'right'
              ? -1
              : index % 2 === 0
                ? 1
                : -1
        const sideAttempts =
          stationing.labelSide === 'auto'
            ? 12
            : stationing.labelSide === 'alternate'
              ? 8
              : 5
        let placed = false
        for (let attempt = 0; attempt < sideAttempts && !placed; attempt += 1) {
          const canFlip =
            stationing.labelSide === 'auto' ||
            stationing.labelSide === 'alternate'
          const side =
            canFlip && attempt % 2 === 1
              ? -preferredSide
              : preferredSide
          const step = canFlip ? Math.floor(attempt / 2) : attempt
          const offset =
            stationing.labelOffset + step * (stationing.labelFontSize + 6)
          labelX = targetX + normalX * offset * side
          labelY = targetY + normalY * offset * side
          collisionBox = {
            x: labelX - rotatedWidth / 2,
            y: labelY - rotatedHeight / 2,
            width: rotatedWidth,
            height: rotatedHeight,
          }
          const insideFrame =
            collisionBox.x >= 6 &&
            collisionBox.y >= 6 &&
            collisionBox.x + collisionBox.width <= frame.width - 6 &&
            collisionBox.y + collisionBox.height <= frame.height - 6
          const overlaps = placedBoxes.some(
            (other) =>
              collisionBox.x < other.x + other.width + 5 &&
              collisionBox.x + collisionBox.width + 5 > other.x &&
              collisionBox.y < other.y + other.height + 5 &&
              collisionBox.y + collisionBox.height + 5 > other.y,
          )
          placed = insideFrame && !overlaps
        }
        if (!placed) {
          labelX = Math.max(
            rotatedWidth / 2 + 6,
            Math.min(frame.width - rotatedWidth / 2 - 6, labelX),
          )
          labelY = Math.max(
            rotatedHeight / 2 + 6,
            Math.min(frame.height - rotatedHeight / 2 - 6, labelY),
          )
          collisionBox = {
            x: labelX - rotatedWidth / 2,
            y: labelY - rotatedHeight / 2,
            width: rotatedWidth,
            height: rotatedHeight,
          }
        }
      }

      placedBoxes.push(collisionBox)
      layouts.push({
        id: tick.id,
        text,
        targetX,
        targetY,
        labelX,
        labelY,
        labelPoint:
          override?.labelPoint ?? view.screenToMerc(labelX, labelY),
        width,
        height,
        angle,
        collisionBox,
        moved: Boolean(override?.labelPoint),
      })
    })

  return layouts
}

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
