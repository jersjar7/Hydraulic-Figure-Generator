import type { HydraulicProfileLine } from '../types'

export type HydraulicProfilePoint = {
  distance: number
  elevation: number
}

export type HydraulicProfileSegment = HydraulicProfilePoint[]

const EPSILON = 1e-9

function normalizeSegment(points: HydraulicProfileSegment) {
  const ordered = [...points].sort((left, right) => left.distance - right.distance)
  return ordered.reduce<HydraulicProfileSegment>((result, point) => {
    const previous = result.at(-1)
    if (previous && Math.abs(previous.distance - point.distance) <= EPSILON) {
      result[result.length - 1] = point
    } else {
      result.push(point)
    }
    return result
  }, [])
}

export function hydraulicProfileLineSegments(
  line: HydraulicProfileLine,
): HydraulicProfileSegment[] {
  const segments: HydraulicProfileSegment[] = []
  let current: HydraulicProfileSegment = []
  line.distances.forEach((distance, index) => {
    const elevation = line.elevations[index]
    if (elevation == null || !Number.isFinite(distance) || !Number.isFinite(elevation)) {
      if (current.length > 0) segments.push(normalizeSegment(current))
      current = []
      return
    }
    current.push({ distance, elevation })
  })
  if (current.length > 0) segments.push(normalizeSegment(current))
  return segments.filter((segment) => segment.length > 0)
}

function interpolateSegment(segment: HydraulicProfileSegment, distance: number) {
  for (let index = 1; index < segment.length; index += 1) {
    const left = segment[index - 1]
    const right = segment[index]
    if (distance < left.distance - EPSILON || distance > right.distance + EPSILON) continue
    if (Math.abs(right.distance - left.distance) <= EPSILON) return left.elevation
    const fraction = (distance - left.distance) / (right.distance - left.distance)
    return left.elevation + (right.elevation - left.elevation) * fraction
  }
  if (segment.length === 1 && Math.abs(segment[0].distance - distance) <= EPSILON) {
    return segment[0].elevation
  }
  return null
}

export function interpolateHydraulicProfileLine(
  line: HydraulicProfileLine,
  distance: number,
) {
  for (const segment of hydraulicProfileLineSegments(line)) {
    const elevation = interpolateSegment(segment, distance)
    if (elevation != null) return elevation
  }
  return null
}

function appendPiece(
  result: HydraulicProfileSegment[],
  start: HydraulicProfilePoint,
  end: HydraulicProfilePoint,
) {
  if (Math.abs(end.distance - start.distance) <= EPSILON) return
  const previous = result.at(-1)
  const previousEnd = previous?.at(-1)
  if (
    previous
    && previousEnd
    && Math.abs(previousEnd.distance - start.distance) <= EPSILON
    && Math.abs(previousEnd.elevation - start.elevation) <= EPSILON
  ) {
    previous.push(end)
  } else {
    result.push([start, end])
  }
}

function uniqueSorted(values: number[]) {
  return values
    .sort((left, right) => left - right)
    .filter((value, index, ordered) => index === 0 || Math.abs(value - ordered[index - 1]) > EPSILON)
}

function clipOverlap(
  surface: HydraulicProfileSegment,
  ground: HydraulicProfileSegment,
  overlapMinimum: number,
  overlapMaximum: number,
) {
  const result: HydraulicProfileSegment[] = []
  const breakpoints = uniqueSorted([
    overlapMinimum,
    overlapMaximum,
    ...surface.map(({ distance }) => distance).filter((distance) => distance > overlapMinimum && distance < overlapMaximum),
    ...ground.map(({ distance }) => distance).filter((distance) => distance > overlapMinimum && distance < overlapMaximum),
  ])

  for (let index = 1; index < breakpoints.length; index += 1) {
    const leftDistance = breakpoints[index - 1]
    const rightDistance = breakpoints[index]
    const leftSurface = interpolateSegment(surface, leftDistance)
    const rightSurface = interpolateSegment(surface, rightDistance)
    const leftGround = interpolateSegment(ground, leftDistance)
    const rightGround = interpolateSegment(ground, rightDistance)
    if (
      leftSurface == null
      || rightSurface == null
      || leftGround == null
      || rightGround == null
    ) continue

    const leftDifference = leftSurface - leftGround
    const rightDifference = rightSurface - rightGround
    if (Math.abs(leftDifference) <= EPSILON && Math.abs(rightDifference) <= EPSILON) continue
    const leftWet = leftDifference >= -EPSILON
    const rightWet = rightDifference >= -EPSILON
    const leftPoint = { distance: leftDistance, elevation: leftSurface }
    const rightPoint = { distance: rightDistance, elevation: rightSurface }
    if (leftWet && rightWet) {
      appendPiece(result, leftPoint, rightPoint)
      continue
    }
    if (!leftWet && !rightWet) continue

    const fraction = leftDifference / (leftDifference - rightDifference)
    const intersection = {
      distance: leftDistance + (rightDistance - leftDistance) * fraction,
      elevation: leftSurface + (rightSurface - leftSurface) * fraction,
    }
    if (leftWet) appendPiece(result, leftPoint, intersection)
    else appendPiece(result, intersection, rightPoint)
  }
  return result
}

export function clipHydraulicProfileLineAtGround(
  surface: HydraulicProfileLine,
  ground: HydraulicProfileLine,
): HydraulicProfileSegment[] {
  const result: HydraulicProfileSegment[] = []
  for (const surfaceSegment of hydraulicProfileLineSegments(surface)) {
    if (surfaceSegment.length < 2) continue
    for (const groundSegment of hydraulicProfileLineSegments(ground)) {
      if (groundSegment.length < 2) continue
      const overlapMinimum = Math.max(surfaceSegment[0].distance, groundSegment[0].distance)
      const overlapMaximum = Math.min(
        surfaceSegment.at(-1)!.distance,
        groundSegment.at(-1)!.distance,
      )
      if (overlapMaximum - overlapMinimum <= EPSILON) continue
      result.push(...clipOverlap(
        surfaceSegment,
        groundSegment,
        overlapMinimum,
        overlapMaximum,
      ))
    }
  }
  return result.sort((left, right) => left[0].distance - right[0].distance)
}
