import type {
  MapCoordinate,
  WseAssessmentLine,
  WseAssessmentLineCollection,
} from './types'

const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

type Segment = {
  start: MapCoordinate
  end: MapCoordinate
}

type GraphNode = {
  point: MapCoordinate
  edges: number[]
}

export type WseAssessmentLineInput = {
  x: Float64Array
  y: Float64Array
  triangles: Uint32Array
  wse: Float32Array
  depth: Float32Array
  dryDepth: number
  interval: number
  feetPerMapUnit: number
}

function contourLevels(minimum: number, maximum: number, interval: number) {
  const tolerance = interval * 1e-9
  const first = (Math.floor((minimum + tolerance) / interval) + 1) * interval
  const last = (Math.ceil((maximum - tolerance) / interval) - 1) * interval
  const count = Math.max(0, Math.floor((last - first) / interval + 1.0000001))
  if (count > 2_000) {
    throw new Error(
      'The assessment-line interval produces more than 2,000 WSE levels.',
    )
  }
  return Array.from({ length: count }, (_, index) => first + index * interval)
}

function triangleSegments(
  input: WseAssessmentLineInput,
  level: number,
) {
  const segments: Segment[] = []
  // A tiny offset avoids ambiguous branches when a vertex falls exactly on a
  // requested level without materially moving the displayed contour.
  const sampledLevel = level + Math.max(1e-9, Math.abs(level) * 1e-10)

  for (
    let triangleIndex = 0;
    triangleIndex < input.triangles.length;
    triangleIndex += 3
  ) {
    const ids = [
      input.triangles[triangleIndex],
      input.triangles[triangleIndex + 1],
      input.triangles[triangleIndex + 2],
    ]
    if (
      ids.some(
        (id) =>
          !VALID(input.wse[id]) ||
          !VALID(input.depth[id]) ||
          input.depth[id] <= input.dryDepth,
      )
    ) {
      continue
    }

    const intersections: MapCoordinate[] = []
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const first = ids[edgeIndex]
      const second = ids[(edgeIndex + 1) % 3]
      const firstValue = input.wse[first]
      const secondValue = input.wse[second]
      if (
        (firstValue < sampledLevel && secondValue >= sampledLevel) ||
        (secondValue < sampledLevel && firstValue >= sampledLevel)
      ) {
        const fraction =
          (sampledLevel - firstValue) / (secondValue - firstValue)
        intersections.push({
          x: input.x[first] + (input.x[second] - input.x[first]) * fraction,
          y: input.y[first] + (input.y[second] - input.y[first]) * fraction,
        })
      }
    }
    if (intersections.length === 2) {
      segments.push({ start: intersections[0], end: intersections[1] })
    }
  }
  return segments
}

function coordinateKey(point: MapCoordinate, tolerance: number) {
  return `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}`
}

function stitchSegments(segments: Segment[], tolerance: number) {
  const nodes = new Map<string, GraphNode>()
  const edgeNodes: [string, string][] = []

  const addNode = (point: MapCoordinate, edgeIndex: number) => {
    const key = coordinateKey(point, tolerance)
    const current = nodes.get(key)
    if (current) {
      current.edges.push(edgeIndex)
    } else {
      nodes.set(key, { point, edges: [edgeIndex] })
    }
    return key
  }

  segments.forEach((segment, edgeIndex) => {
    edgeNodes.push([
      addNode(segment.start, edgeIndex),
      addNode(segment.end, edgeIndex),
    ])
  })

  const visited = new Uint8Array(segments.length)
  const paths: MapCoordinate[][] = []

  const walk = (startKey: string) => {
    const points: MapCoordinate[] = []
    let currentKey = startKey
    let previousEdge = -1

    while (true) {
      const node = nodes.get(currentKey)
      if (!node) break
      if (points.length === 0) points.push(node.point)
      const nextEdge = node.edges.find(
        (edgeIndex) => edgeIndex !== previousEdge && !visited[edgeIndex],
      )
      if (nextEdge === undefined) break
      visited[nextEdge] = 1
      const [firstKey, secondKey] = edgeNodes[nextEdge]
      const nextKey = firstKey === currentKey ? secondKey : firstKey
      const nextNode = nodes.get(nextKey)
      if (!nextNode) break
      points.push(nextNode.point)
      previousEdge = nextEdge
      currentKey = nextKey
      if (currentKey === startKey) break
    }
    return points
  }

  for (const [key, node] of nodes) {
    if (node.edges.length !== 1) continue
    const path = walk(key)
    if (path.length >= 2) paths.push(path)
  }
  for (let edgeIndex = 0; edgeIndex < segments.length; edgeIndex += 1) {
    if (visited[edgeIndex]) continue
    const path = walk(edgeNodes[edgeIndex][0])
    if (path.length >= 2) paths.push(path)
  }
  return paths
}

function pathLength(points: MapCoordinate[]) {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
  }
  return length
}

export function generateWseAssessmentLines(
  input: WseAssessmentLineInput,
): WseAssessmentLineCollection {
  if (!Number.isFinite(input.interval) || input.interval <= 0) {
    throw new Error('Assessment-line interval must be greater than zero.')
  }
  if (!Number.isFinite(input.feetPerMapUnit) || input.feetPerMapUnit <= 0) {
    throw new Error('Assessment-line map units could not be converted to feet.')
  }
  if (
    input.x.length !== input.y.length ||
    input.x.length !== input.wse.length ||
    input.x.length !== input.depth.length
  ) {
    throw new Error('Assessment-line coordinate and result arrays must align.')
  }

  let minimum = Number.POSITIVE_INFINITY
  let maximum = Number.NEGATIVE_INFINITY
  for (let index = 0; index < input.wse.length; index += 1) {
    if (
      VALID(input.wse[index]) &&
      VALID(input.depth[index]) &&
      input.depth[index] > input.dryDepth
    ) {
      minimum = Math.min(minimum, input.wse[index])
      maximum = Math.max(maximum, input.wse[index])
    }
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return {
      interval: input.interval,
      minimumLevel: null,
      maximumLevel: null,
      levelCount: 0,
      lines: [],
    }
  }

  const levels = contourLevels(minimum, maximum, input.interval)
  let minimumX = Number.POSITIVE_INFINITY
  let maximumX = Number.NEGATIVE_INFINITY
  let minimumY = Number.POSITIVE_INFINITY
  let maximumY = Number.NEGATIVE_INFINITY
  for (let index = 0; index < input.x.length; index += 1) {
    minimumX = Math.min(minimumX, input.x[index])
    maximumX = Math.max(maximumX, input.x[index])
    minimumY = Math.min(minimumY, input.y[index])
    maximumY = Math.max(maximumY, input.y[index])
  }
  const extent = Math.max(maximumX - minimumX, maximumY - minimumY, 1)
  const stitchTolerance = extent * 1e-8
  const lines: WseAssessmentLine[] = []

  for (const level of levels) {
    const paths = stitchSegments(
      triangleSegments(input, level),
      stitchTolerance,
    ).sort((first, second) => pathLength(second) - pathLength(first))
    paths.forEach((points, pathIndex) => {
      lines.push({
        id: `existing-wse:${level.toFixed(6)}:${pathIndex}`,
        source: 'existing-wse',
        level,
        points,
        lengthFeet: pathLength(points) * input.feetPerMapUnit,
      })
    })
  }

  return {
    interval: input.interval,
    minimumLevel: levels.at(0) ?? null,
    maximumLevel: levels.at(-1) ?? null,
    levelCount: new Set(lines.map((line) => line.level)).size,
    lines,
  }
}
