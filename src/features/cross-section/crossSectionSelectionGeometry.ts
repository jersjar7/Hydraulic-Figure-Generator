import type { MapCoordinate } from '../../core/types'

export function lineDistanceToPoint(
  point: MapCoordinate,
  start: MapCoordinate,
  end: MapCoordinate,
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  const fraction =
    length2 > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              length2,
          ),
        )
      : 0
  return Math.hypot(
    point.x - (start.x + dx * fraction),
    point.y - (start.y + dy * fraction),
  )
}

export function mapPolylineLengthFeet(
  points: MapCoordinate[],
  feetPerMapUnit: number,
) {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
  }
  return length * feetPerMapUnit
}
