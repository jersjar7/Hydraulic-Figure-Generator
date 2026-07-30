import type {
  DischargeWeightedWse,
  MapCoordinate,
  ProjectedGeometry,
} from '../types'

const VALID_RESULT_MINIMUM = -900
const MINIMUM_SAMPLE_COUNT = 25
const MAXIMUM_SAMPLE_COUNT = 601

type TriangleIndex = {
  cellSize: number
  x0: number
  y0: number
  cells: Map<string, number[]>
}

type BarycentricLocation = {
  triangleOffset: number
  a: number
  b: number
  c: number
}

export type MeshCrossSectionResults = {
  ground: Float32Array
  wse: Float32Array
  depth: Float32Array
  velocity?: {
    vx: Float32Array
    vy: Float32Array
  }
}

export type SampledMeshCrossSection = {
  points: MapCoordinate[]
  modelPoints: MapCoordinate[]
  distance: Float64Array
  ground: (number | null)[]
  wse: (number | null)[]
  depth: (number | null)[]
  normalVelocity: (number | null)[]
  average: DischargeWeightedWse
}

const triangleIndices = new WeakMap<ProjectedGeometry, TriangleIndex>()

function cellKey(x: number, y: number) {
  return `${x}:${y}`
}

function buildTriangleIndex(geometry: ProjectedGeometry) {
  const cached = triangleIndices.get(geometry)
  if (cached) return cached

  const triangleCount = Math.max(1, geometry.tris.length / 3)
  const span = Math.max(
    geometry.bbox.x1 - geometry.bbox.x0,
    geometry.bbox.y1 - geometry.bbox.y0,
    1,
  )
  const cellSize = span / Math.max(12, Math.sqrt(triangleCount))
  const index: TriangleIndex = {
    cellSize,
    x0: geometry.bbox.x0,
    y0: geometry.bbox.y0,
    cells: new Map(),
  }

  for (let offset = 0; offset < geometry.tris.length; offset += 3) {
    const first = geometry.tris[offset]
    const second = geometry.tris[offset + 1]
    const third = geometry.tris[offset + 2]
    const minimumX = Math.min(
      geometry.mx[first],
      geometry.mx[second],
      geometry.mx[third],
    )
    const maximumX = Math.max(
      geometry.mx[first],
      geometry.mx[second],
      geometry.mx[third],
    )
    const minimumY = Math.min(
      geometry.my[first],
      geometry.my[second],
      geometry.my[third],
    )
    const maximumY = Math.max(
      geometry.my[first],
      geometry.my[second],
      geometry.my[third],
    )
    const x0 = Math.floor((minimumX - index.x0) / cellSize)
    const x1 = Math.floor((maximumX - index.x0) / cellSize)
    const y0 = Math.floor((minimumY - index.y0) / cellSize)
    const y1 = Math.floor((maximumY - index.y0) / cellSize)
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const key = cellKey(x, y)
        const offsets = index.cells.get(key) ?? []
        offsets.push(offset)
        index.cells.set(key, offsets)
      }
    }
  }

  triangleIndices.set(geometry, index)
  return index
}

function barycentricLocation(
  geometry: ProjectedGeometry,
  triangleOffset: number,
  point: MapCoordinate,
): BarycentricLocation | null {
  const first = geometry.tris[triangleOffset]
  const second = geometry.tris[triangleOffset + 1]
  const third = geometry.tris[triangleOffset + 2]
  const ax = geometry.mx[first]
  const ay = geometry.my[first]
  const bx = geometry.mx[second]
  const by = geometry.my[second]
  const cx = geometry.mx[third]
  const cy = geometry.my[third]
  const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
  if (Math.abs(denominator) < Number.EPSILON) return null
  const a =
    ((by - cy) * (point.x - cx) + (cx - bx) * (point.y - cy)) /
    denominator
  const b =
    ((cy - ay) * (point.x - cx) + (ax - cx) * (point.y - cy)) /
    denominator
  const c = 1 - a - b
  const tolerance = 1e-7
  return a >= -tolerance && b >= -tolerance && c >= -tolerance
    ? { triangleOffset, a, b, c }
    : null
}

function locatePoint(
  geometry: ProjectedGeometry,
  point: MapCoordinate,
  previousTriangleOffset: number | null,
) {
  if (previousTriangleOffset != null) {
    const previous = barycentricLocation(
      geometry,
      previousTriangleOffset,
      point,
    )
    if (previous) return previous
  }

  const index = buildTriangleIndex(geometry)
  const cellX = Math.floor((point.x - index.x0) / index.cellSize)
  const cellY = Math.floor((point.y - index.y0) / index.cellSize)
  for (let radius = 0; radius <= 1; radius += 1) {
    for (let x = cellX - radius; x <= cellX + radius; x += 1) {
      for (let y = cellY - radius; y <= cellY + radius; y += 1) {
        const candidates = index.cells.get(cellKey(x, y)) ?? []
        for (const triangleOffset of candidates) {
          const location = barycentricLocation(
            geometry,
            triangleOffset,
            point,
          )
          if (location) return location
        }
      }
    }
  }
  return null
}

function interpolate(
  geometry: ProjectedGeometry,
  values: ArrayLike<number>,
  location: BarycentricLocation,
) {
  const first = geometry.tris[location.triangleOffset]
  const second = geometry.tris[location.triangleOffset + 1]
  const third = geometry.tris[location.triangleOffset + 2]
  const firstValue = values[first]
  const secondValue = values[second]
  const thirdValue = values[third]
  if (
    !Number.isFinite(firstValue) ||
    !Number.isFinite(secondValue) ||
    !Number.isFinite(thirdValue) ||
    firstValue <= VALID_RESULT_MINIMUM ||
    secondValue <= VALID_RESULT_MINIMUM ||
    thirdValue <= VALID_RESULT_MINIMUM
  ) {
    return null
  }
  return (
    firstValue * location.a +
    secondValue * location.b +
    thirdValue * location.c
  )
}

function interpolateModelPoint(
  geometry: ProjectedGeometry,
  location: BarycentricLocation,
) {
  const first = geometry.tris[location.triangleOffset]
  const second = geometry.tris[location.triangleOffset + 1]
  const third = geometry.tris[location.triangleOffset + 2]
  return {
    x:
      geometry.xy[first * 2] * location.a +
      geometry.xy[second * 2] * location.b +
      geometry.xy[third * 2] * location.c,
    y:
      geometry.xy[first * 2 + 1] * location.a +
      geometry.xy[second * 2 + 1] * location.b +
      geometry.xy[third * 2 + 1] * location.c,
  }
}

function samplePolyline(
  points: MapCoordinate[],
  geometry: ProjectedGeometry,
  sampleSpacing: number,
) {
  if (points.length < 2) {
    throw new Error('A cross section needs at least two points.')
  }
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] +
        Math.hypot(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y,
        ),
    )
  }
  const totalMapLength = cumulative.at(-1) ?? 0
  if (totalMapLength <= 0) {
    throw new Error('The cross-section line has zero length.')
  }
  const estimatedFeet = totalMapLength * geometry.ftPerMerc
  const count = Math.min(
    MAXIMUM_SAMPLE_COUNT,
    Math.max(
      MINIMUM_SAMPLE_COUNT,
      Math.ceil(estimatedFeet / Math.max(sampleSpacing, 0.25)) + 1,
    ),
  )
  const samples: MapCoordinate[] = []
  let segment = 1
  for (let index = 0; index < count; index += 1) {
    const target = (totalMapLength * index) / (count - 1)
    while (segment < cumulative.length - 1 && cumulative[segment] < target) {
      segment += 1
    }
    const start = points[segment - 1]
    const end = points[segment]
    const segmentLength = cumulative[segment] - cumulative[segment - 1]
    const fraction =
      segmentLength > 0 ? (target - cumulative[segment - 1]) / segmentLength : 0
    samples.push({
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    })
  }
  return samples
}

function cumulativeModelDistance(points: (MapCoordinate | null)[]) {
  const distance = new Float64Array(points.length)
  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1]
    const second = points[index]
    distance[index] =
      distance[index - 1] +
      (first && second
        ? Math.hypot(second.x - first.x, second.y - first.y)
        : 0)
  }
  return distance
}

function normalVelocities(
  modelPoints: (MapCoordinate | null)[],
  vx: (number | null)[],
  vy: (number | null)[],
) {
  return modelPoints.map((point, index) => {
    if (!point || vx[index] == null || vy[index] == null) return null
    const before = modelPoints[Math.max(0, index - 1)]
    const after = modelPoints[Math.min(modelPoints.length - 1, index + 1)]
    if (!before || !after) return null
    const dx = after.x - before.x
    const dy = after.y - before.y
    const length = Math.hypot(dx, dy)
    if (length <= 0) return null
    return Math.abs(vx[index]! * (-dy / length) + vy[index]! * (dx / length))
  })
}

export function dischargeWeightedAverage(
  distance: ArrayLike<number>,
  wse: (number | null)[],
  depth: (number | null)[],
  normalVelocity: (number | null)[],
  dryDepth: number,
): DischargeWeightedWse {
  let weightedWse = 0
  let discharge = 0
  let wetStart: number | null = null
  let wetEnd: number | null = null

  const weight = (index: number) => {
    const sampleDepth = depth[index]
    const velocity = normalVelocity[index]
    const sampleWse = wse[index]
    if (
      sampleDepth == null ||
      velocity == null ||
      sampleWse == null ||
      sampleDepth <= dryDepth
    ) {
      return null
    }
    return sampleDepth * Math.abs(velocity)
  }

  for (let index = 1; index < distance.length; index += 1) {
    const firstWeight = weight(index - 1)
    const secondWeight = weight(index)
    const width = distance[index] - distance[index - 1]
    if (
      firstWeight == null ||
      secondWeight == null ||
      width <= 0
    ) {
      continue
    }
    const segmentDischarge = ((firstWeight + secondWeight) / 2) * width
    const segmentWse =
      ((wse[index - 1]! * firstWeight + wse[index]! * secondWeight) / 2) *
      width
    discharge += segmentDischarge
    weightedWse += segmentWse
    wetStart = wetStart == null ? distance[index - 1] : wetStart
    wetEnd = distance[index]
  }

  return {
    value: discharge > 0 ? weightedWse / discharge : null,
    discharge,
    wetStart,
    wetEnd,
  }
}

export function sampleMeshCrossSection(
  geometry: ProjectedGeometry,
  linePoints: MapCoordinate[],
  results: MeshCrossSectionResults,
  dryDepth: number,
  sampleSpacing: number,
): SampledMeshCrossSection {
  if (
    results.ground.length !== geometry.N ||
    results.wse.length !== geometry.N ||
    results.depth.length !== geometry.N
  ) {
    throw new Error('Cross-section result arrays must align with the mesh.')
  }
  if (
    results.velocity &&
    (results.velocity.vx.length !== geometry.N ||
      results.velocity.vy.length !== geometry.N)
  ) {
    throw new Error('Cross-section velocity arrays must align with the mesh.')
  }

  const points = samplePolyline(linePoints, geometry, sampleSpacing)
  const locations: (BarycentricLocation | null)[] = []
  let previousTriangleOffset: number | null = null
  for (const point of points) {
    const location = locatePoint(geometry, point, previousTriangleOffset)
    locations.push(location)
    previousTriangleOffset = location?.triangleOffset ?? null
  }
  const modelPoints = locations.map((location) =>
    location ? interpolateModelPoint(geometry, location) : null,
  )
  const distance = cumulativeModelDistance(modelPoints)
  const ground = locations.map((location) =>
    location ? interpolate(geometry, results.ground, location) : null,
  )
  const depth = locations.map((location) =>
    location ? interpolate(geometry, results.depth, location) : null,
  )
  const wse = locations.map((location, index) => {
    if (!location || depth[index] == null || depth[index]! <= dryDepth) {
      return null
    }
    return interpolate(geometry, results.wse, location)
  })
  const vx = locations.map((location) =>
    location && results.velocity
      ? interpolate(geometry, results.velocity.vx, location)
      : null,
  )
  const vy = locations.map((location) =>
    location && results.velocity
      ? interpolate(geometry, results.velocity.vy, location)
      : null,
  )
  const normalVelocity = normalVelocities(modelPoints, vx, vy)
  const average = dischargeWeightedAverage(
    distance,
    wse,
    depth,
    normalVelocity,
    dryDepth,
  )

  return {
    points,
    modelPoints: modelPoints.map(
      (point) => point ?? { x: Number.NaN, y: Number.NaN },
    ),
    distance,
    ground,
    wse,
    depth,
    normalVelocity,
    average,
  }
}
