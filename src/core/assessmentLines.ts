import type {
  MapCoordinate,
  WseAssessmentLine,
  WseAssessmentLineCollection,
} from './types'

const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

type Segment = {
  startMap: MapCoordinate
  endMap: MapCoordinate
  startModel: MapCoordinate
  endModel: MapCoordinate
}

type GraphNode = {
  mapPoint: MapCoordinate
  modelPoint: MapCoordinate
  edges: number[]
}

export type WseAssessmentLineInput = {
  mapX: Float64Array
  mapY: Float64Array
  modelX: Float64Array
  modelY: Float64Array
  triangles: Uint32Array
  wse: Float32Array
  depth: Float32Array
  dryDepth: number
  interval: number
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

    const mapIntersections: MapCoordinate[] = []
    const modelIntersections: MapCoordinate[] = []
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
        mapIntersections.push({
          x:
            input.mapX[first] +
            (input.mapX[second] - input.mapX[first]) * fraction,
          y:
            input.mapY[first] +
            (input.mapY[second] - input.mapY[first]) * fraction,
        })
        modelIntersections.push({
          x:
            input.modelX[first] +
            (input.modelX[second] - input.modelX[first]) * fraction,
          y:
            input.modelY[first] +
            (input.modelY[second] - input.modelY[first]) * fraction,
        })
      }
    }
    if (mapIntersections.length === 2 && modelIntersections.length === 2) {
      segments.push({
        startMap: mapIntersections[0],
        endMap: mapIntersections[1],
        startModel: modelIntersections[0],
        endModel: modelIntersections[1],
      })
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

  const addNode = (
    modelPoint: MapCoordinate,
    mapPoint: MapCoordinate,
    edgeIndex: number,
  ) => {
    const key = coordinateKey(modelPoint, tolerance)
    const current = nodes.get(key)
    if (current) {
      current.edges.push(edgeIndex)
    } else {
      nodes.set(key, { mapPoint, modelPoint, edges: [edgeIndex] })
    }
    return key
  }

  segments.forEach((segment, edgeIndex) => {
    edgeNodes.push([
      addNode(segment.startModel, segment.startMap, edgeIndex),
      addNode(segment.endModel, segment.endMap, edgeIndex),
    ])
  })

  const visited = new Uint8Array(segments.length)
  const paths: { mapPoints: MapCoordinate[]; modelPoints: MapCoordinate[] }[] =
    []

  const walk = (startKey: string) => {
    const mapPoints: MapCoordinate[] = []
    const modelPoints: MapCoordinate[] = []
    let currentKey = startKey
    let previousEdge = -1

    while (true) {
      const node = nodes.get(currentKey)
      if (!node) break
      if (mapPoints.length === 0) {
        mapPoints.push(node.mapPoint)
        modelPoints.push(node.modelPoint)
      }
      const nextEdge = node.edges.find(
        (edgeIndex) => edgeIndex !== previousEdge && !visited[edgeIndex],
      )
      if (nextEdge === undefined) break
      visited[nextEdge] = 1
      const [firstKey, secondKey] = edgeNodes[nextEdge]
      const nextKey = firstKey === currentKey ? secondKey : firstKey
      const nextNode = nodes.get(nextKey)
      if (!nextNode) break
      mapPoints.push(nextNode.mapPoint)
      modelPoints.push(nextNode.modelPoint)
      previousEdge = nextEdge
      currentKey = nextKey
      if (currentKey === startKey) break
    }
    return { mapPoints, modelPoints }
  }

  for (const [key, node] of nodes) {
    if (node.edges.length !== 1) continue
    const path = walk(key)
    if (path.mapPoints.length >= 2) paths.push(path)
  }
  for (let edgeIndex = 0; edgeIndex < segments.length; edgeIndex += 1) {
    if (visited[edgeIndex]) continue
    const path = walk(edgeNodes[edgeIndex][0])
    if (path.mapPoints.length >= 2) paths.push(path)
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
  if (
    input.mapX.length !== input.mapY.length ||
    input.mapX.length !== input.modelX.length ||
    input.mapX.length !== input.modelY.length ||
    input.mapX.length !== input.wse.length ||
    input.mapX.length !== input.depth.length
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
  for (let index = 0; index < input.modelX.length; index += 1) {
    minimumX = Math.min(minimumX, input.modelX[index])
    maximumX = Math.max(maximumX, input.modelX[index])
    minimumY = Math.min(minimumY, input.modelY[index])
    maximumY = Math.max(maximumY, input.modelY[index])
  }
  const extent = Math.max(maximumX - minimumX, maximumY - minimumY, 1)
  const stitchTolerance = extent * 1e-8
  const lines: WseAssessmentLine[] = []

  for (const level of levels) {
    const paths = stitchSegments(
      triangleSegments(input, level),
      stitchTolerance,
    ).sort(
      (first, second) =>
        pathLength(second.modelPoints) - pathLength(first.modelPoints),
    )
    paths.forEach(({ mapPoints, modelPoints }, pathIndex) => {
      lines.push({
        id: `existing-wse:${level.toFixed(6)}:${pathIndex}`,
        source: 'existing-wse',
        level,
        points: mapPoints,
        modelPoints,
        lengthFeet: pathLength(modelPoints),
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
