import type { ProjectedGeometry, SpatialIndex } from './types'

function gridKey(cellX: number, cellY: number) {
  return `${cellX},${cellY}`
}

export function buildSpatialIndex(projected: ProjectedGeometry): SpatialIndex {
  if (projected.index) return projected.index

  const bbox = projected.bbox
  const span = Math.max(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0)
  const cell = Math.max(
    span / Math.max(20, Math.sqrt(projected.N) / 2),
    Number.EPSILON,
  )
  const grid = new Map<string, number[]>()

  for (let index = 0; index < projected.N; index += 1) {
    const cellX = Math.floor((projected.mx[index] - bbox.x0) / cell)
    const cellY = Math.floor((projected.my[index] - bbox.y0) / cell)
    const key = gridKey(cellX, cellY)
    const bucket = grid.get(key) ?? []
    bucket.push(index)
    grid.set(key, bucket)
  }

  projected.index = { b: bbox, cell, grid }
  return projected.index
}

export type NearestNodeMatch = {
  index: number
  distance2: number
}

export function findNearestNode(
  projected: ProjectedGeometry,
  mx: number,
  my: number,
): NearestNodeMatch {
  const spatialIndex = buildSpatialIndex(projected)
  const { b: bbox, cell, grid } = spatialIndex
  const cellX = Math.floor((mx - bbox.x0) / cell)
  const cellY = Math.floor((my - bbox.y0) / cell)
  const maxCellX = Math.floor((bbox.x1 - bbox.x0) / cell)
  const maxCellY = Math.floor((bbox.y1 - bbox.y0) / cell)
  const maxRadius =
    Math.max(
      Math.abs(cellX),
      Math.abs(cellY),
      Math.abs(cellX - maxCellX),
      Math.abs(cellY - maxCellY),
    ) + 1

  let nearestIndex = -1
  let nearestDistanceSquared = Number.POSITIVE_INFINITY

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
      for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
        if (Math.max(Math.abs(xOffset), Math.abs(yOffset)) !== radius) continue
        const bucket = grid.get(gridKey(cellX + xOffset, cellY + yOffset))
        if (!bucket) continue

        for (const candidate of bucket) {
          const dx = projected.mx[candidate] - mx
          const dy = projected.my[candidate] - my
          const distanceSquared = dx * dx + dy * dy
          if (distanceSquared < nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared
            nearestIndex = candidate
          }
        }
      }
    }

    if (nearestIndex < 0) continue

    const left = bbox.x0 + (cellX - radius) * cell
    const right = bbox.x0 + (cellX + radius + 1) * cell
    const bottom = bbox.y0 + (cellY - radius) * cell
    const top = bbox.y0 + (cellY + radius + 1) * cell
    const queryInsideSearch =
      mx >= left && mx <= right && my >= bottom && my <= top
    const distanceToUnsearchedArea = Math.min(
      mx - left,
      right - mx,
      my - bottom,
      top - my,
    )

    if (
      queryInsideSearch &&
      nearestDistanceSquared <= distanceToUnsearchedArea ** 2
    ) {
      break
    }
  }

  return { index: nearestIndex, distance2: nearestDistanceSquared }
}

export function meshMatchToleranceSquared(projected: ProjectedGeometry) {
  if (projected.matchTolerance2) return projected.matchTolerance2

  const edgeLengths: number[] = []
  for (let triangle = 0; triangle < projected.tris.length; triangle += 3) {
    const ids = [
      projected.tris[triangle],
      projected.tris[triangle + 1],
      projected.tris[triangle + 2],
    ]
    for (let edge = 0; edge < 3; edge += 1) {
      const first = ids[edge]
      const second = ids[(edge + 1) % 3]
      edgeLengths.push(
        Math.hypot(
          projected.mx[first] - projected.mx[second],
          projected.my[first] - projected.my[second],
        ),
      )
    }
  }

  edgeLengths.sort((first, second) => first - second)
  const medianEdge =
    edgeLengths[Math.floor(edgeLengths.length / 2)] ??
    buildSpatialIndex(projected).cell
  const tolerance = Math.max(
    medianEdge * 2.25,
    buildSpatialIndex(projected).cell * 0.75,
  )
  projected.matchTolerance2 = tolerance * tolerance
  return projected.matchTolerance2
}
