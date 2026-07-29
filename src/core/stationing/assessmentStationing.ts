import type {
  AssessmentIntersection,
  AssessmentLineOverrides,
  CenterlineCandidate,
  CenterlineDirection,
  MapCoordinate,
  StationedAssessmentLine,
  StationedAssessmentLineCollection,
  WseAssessmentLine,
} from '../types'
import { centerlineDistances } from './centerlineTicks'

const INTERSECTION_DEDUPLICATION_FEET = 0.05
const SHORT_LINE_FEET = 10
type SegmentIntersection = {
  lineFraction: number
  centerlineFraction: number
  modelPoint: MapCoordinate
}

function cross(first: MapCoordinate, second: MapCoordinate) {
  return first.x * second.y - first.y * second.x
}

function subtract(first: MapCoordinate, second: MapCoordinate) {
  return { x: first.x - second.x, y: first.y - second.y }
}

function segmentIntersection(
  lineStart: MapCoordinate,
  lineEnd: MapCoordinate,
  centerlineStart: MapCoordinate,
  centerlineEnd: MapCoordinate,
) {
  const lineVector = subtract(lineEnd, lineStart)
  const centerlineVector = subtract(centerlineEnd, centerlineStart)
  const separation = subtract(centerlineStart, lineStart)
  const denominator = cross(lineVector, centerlineVector)
  const scale = Math.max(
    Math.hypot(lineVector.x, lineVector.y),
    Math.hypot(centerlineVector.x, centerlineVector.y),
    1,
  )
  const tolerance = scale * scale * 1e-12

  if (Math.abs(denominator) <= tolerance) {
    const sameInfiniteLine =
      Math.abs(cross(separation, lineVector)) <= tolerance
    if (!sameInfiniteLine) {
      return { intersection: null, collinear: false }
    }
    const useX = Math.abs(lineVector.x) >= Math.abs(lineVector.y)
    const lineValues = useX
      ? [lineStart.x, lineEnd.x]
      : [lineStart.y, lineEnd.y]
    const centerlineValues = useX
      ? [centerlineStart.x, centerlineEnd.x]
      : [centerlineStart.y, centerlineEnd.y]
    const overlap =
      Math.max(Math.min(...lineValues), Math.min(...centerlineValues)) <=
      Math.min(Math.max(...lineValues), Math.max(...centerlineValues)) +
        scale * 1e-9
    return { intersection: null, collinear: overlap }
  }

  const lineFraction = cross(separation, centerlineVector) / denominator
  const centerlineFraction = cross(separation, lineVector) / denominator
  const fractionTolerance = 1e-9
  if (
    lineFraction < -fractionTolerance ||
    lineFraction > 1 + fractionTolerance ||
    centerlineFraction < -fractionTolerance ||
    centerlineFraction > 1 + fractionTolerance
  ) {
    return { intersection: null, collinear: false }
  }
  const boundedLineFraction = Math.max(0, Math.min(1, lineFraction))
  return {
    intersection: {
      lineFraction: boundedLineFraction,
      centerlineFraction: Math.max(0, Math.min(1, centerlineFraction)),
      modelPoint: {
        x: lineStart.x + lineVector.x * boundedLineFraction,
        y: lineStart.y + lineVector.y * boundedLineFraction,
      },
    } satisfies SegmentIntersection,
    collinear: false,
  }
}

function lineIntersections(
  line: WseAssessmentLine,
  centerline: CenterlineCandidate,
  distances: Float64Array,
  direction: CenterlineDirection,
  startStation: number,
) {
  const intersections: Omit<AssessmentIntersection, 'index'>[] = []
  let collinear = false

  for (let lineIndex = 1; lineIndex < line.modelPoints.length; lineIndex += 1) {
    for (
      let centerlineIndex = 1;
      centerlineIndex < centerline.modelPoints.length;
      centerlineIndex += 1
    ) {
      const result = segmentIntersection(
        line.modelPoints[lineIndex - 1],
        line.modelPoints[lineIndex],
        centerline.modelPoints[centerlineIndex - 1],
        centerline.modelPoints[centerlineIndex],
      )
      collinear ||= result.collinear
      if (!result.intersection) continue
      const fraction = result.intersection.centerlineFraction
      const segmentLength =
        distances[centerlineIndex] - distances[centerlineIndex - 1]
      const offset = distances[centerlineIndex - 1] + segmentLength * fraction
      const directedOffset =
        direction === 'a-to-b' ? offset : centerline.lengthFeet - offset
      const mapStart = centerline.mapPoints[centerlineIndex - 1]
      const mapEnd = centerline.mapPoints[centerlineIndex]
      intersections.push({
        modelPoint: result.intersection.modelPoint,
        mapPoint: {
          x: mapStart.x + (mapEnd.x - mapStart.x) * fraction,
          y: mapStart.y + (mapEnd.y - mapStart.y) * fraction,
        },
        mapTangent: {
          x:
            (mapEnd.x - mapStart.x) *
            (direction === 'a-to-b' ? 1 : -1),
          y:
            (mapEnd.y - mapStart.y) *
            (direction === 'a-to-b' ? 1 : -1),
        },
        centerlineOffsetFeet: offset,
        stationFeet: startStation + directedOffset,
      })
    }
  }

  intersections.sort(
    (first, second) =>
      first.centerlineOffsetFeet - second.centerlineOffsetFeet,
  )
  const deduplicated = intersections.filter(
    (intersection, index) =>
      index === 0 ||
      Math.abs(
        intersection.centerlineOffsetFeet -
          intersections[index - 1].centerlineOffsetFeet,
      ) > INTERSECTION_DEDUPLICATION_FEET,
  )
  return {
    intersections: deduplicated.map((intersection, index) => ({
      ...intersection,
      index,
    })),
    collinear,
  }
}

function stationLine(
  line: WseAssessmentLine,
  centerline: CenterlineCandidate,
  distances: Float64Array,
  direction: CenterlineDirection,
  startStation: number,
  override: AssessmentLineOverrides[string] | undefined,
): StationedAssessmentLine {
  const result = lineIntersections(
    line,
    centerline,
    distances,
    direction,
    startStation,
  )
  const warnings =
    line.lengthFeet < SHORT_LINE_FEET
      ? [`Short assessment path (${line.lengthFeet.toFixed(1)} ft).`]
      : []

  if (result.collinear) {
    if (override?.included === false) {
      return {
        line,
        intersections: result.intersections,
        selectedIntersectionIndex: null,
        selectedIntersection: null,
        status: 'excluded',
        reason: 'Excluded by the user.',
        warnings,
      }
    }
    return {
      line,
      intersections: result.intersections,
      selectedIntersectionIndex: null,
      selectedIntersection: null,
      status: 'review',
      reason: 'The assessment line overlaps the centerline.',
      warnings,
    }
  }
  if (result.intersections.length === 0) {
    return {
      line,
      intersections: [],
      selectedIntersectionIndex: null,
      selectedIntersection: null,
      status: 'excluded',
      reason: 'Does not intersect the selected centerline.',
      warnings,
    }
  }

  const requestedIndex = override?.intersectionIndex
  const selectedIndex =
    Number.isInteger(requestedIndex) &&
    requestedIndex !== undefined &&
    requestedIndex >= 0 &&
    requestedIndex < result.intersections.length
      ? requestedIndex
      : result.intersections.length === 1
        ? 0
        : null
  const selectedIntersection =
    selectedIndex === null ? null : result.intersections[selectedIndex]

  if (override?.included === false) {
    return {
      line,
      intersections: result.intersections,
      selectedIntersectionIndex: selectedIndex,
      selectedIntersection,
      status: 'excluded',
      reason: 'Excluded by the user.',
      warnings,
    }
  }
  if (result.intersections.length > 1 && selectedIndex === null) {
    return {
      line,
      intersections: result.intersections,
      selectedIntersectionIndex: null,
      selectedIntersection: null,
      status: 'review',
      reason: `${result.intersections.length} centerline intersections require review.`,
      warnings,
    }
  }
  return {
    line,
    intersections: result.intersections,
    selectedIntersectionIndex: selectedIndex,
    selectedIntersection,
    status: 'included',
    reason:
      result.intersections.length === 1
        ? 'One centerline intersection.'
        : 'Intersection selected by the user.',
    warnings,
  }
}

export function stationAssessmentLines(
  lines: WseAssessmentLine[],
  centerline: CenterlineCandidate,
  direction: CenterlineDirection,
  startStation: number,
  overrides: AssessmentLineOverrides = {},
): StationedAssessmentLineCollection {
  if (!Number.isFinite(startStation)) {
    throw new Error('Starting station must be a finite number.')
  }
  const distances = centerlineDistances(centerline)
  const items = lines.map((line) =>
    stationLine(
      line,
      centerline,
      distances,
      direction,
      startStation,
      overrides[line.id],
    ),
  )
  items.sort((first, second) => {
    const statusOrder = { included: 0, review: 1, excluded: 2 }
    const statusDifference =
      statusOrder[first.status] - statusOrder[second.status]
    if (statusDifference !== 0) return statusDifference
    const firstStation =
      first.selectedIntersection?.stationFeet ?? Number.POSITIVE_INFINITY
    const secondStation =
      second.selectedIntersection?.stationFeet ?? Number.POSITIVE_INFINITY
    if (firstStation !== secondStation) return firstStation - secondStation
    if (first.line.level !== second.line.level) {
      return first.line.level - second.line.level
    }
    return first.line.id.localeCompare(second.line.id)
  })

  return {
    centerline,
    direction,
    startStation,
    items,
    includedCount: items.filter((item) => item.status === 'included').length,
    reviewCount: items.filter((item) => item.status === 'review').length,
    excludedCount: items.filter((item) => item.status === 'excluded').length,
  }
}

