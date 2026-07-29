import { formatStation } from '../centerlineStationing'
import type {
  CenterlineStationLayer,
  CenterlineStationTick,
  FigureSettings,
  MapCoordinate,
} from '../types'
import type { MapFrame, MapView } from './view'

export type StationLabelLayout = {
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

export function stationLabelLayouts(
  layer: CenterlineStationLayer,
  view: MapView,
  settings: FigureSettings,
  frame: MapFrame,
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
        for (
          let attempt = 0;
          attempt < sideAttempts && !placed;
          attempt += 1
        ) {
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
