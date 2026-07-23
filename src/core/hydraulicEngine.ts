import proj4 from 'proj4'
import type {
  Bounds,
  ConditionData,
  ConditionKey,
  DatasetCatalog,
  DatasetRun,
  Geometry,
  IngestNotice,
  MapCoordinate,
  ProjectedGeometry,
  RunSelection,
  WseExtremumKind,
  WseDifferenceScene,
} from './types'

const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

export type WseDifferenceExtremum = {
  kind: WseExtremumKind
  index: number
  value: number
  point: MapCoordinate
}

export type WseDifferenceExtrema = {
  rise: WseDifferenceExtremum | null
  reduction: WseDifferenceExtremum | null
}

export function findWseDifferenceExtrema(
  scene: WseDifferenceScene,
): WseDifferenceExtrema {
  let riseIndex = -1
  let riseValue = 0
  let reductionIndex = -1
  let reductionValue = 0

  for (let index = 0; index < scene.diff.length; index += 1) {
    const value = scene.diff[index]
    if (!VALID(value)) continue
    if (value > riseValue) {
      riseValue = value
      riseIndex = index
    }
    if (value < reductionValue) {
      reductionValue = value
      reductionIndex = index
    }
  }

  const result = (
    kind: WseExtremumKind,
    index: number,
    value: number,
  ): WseDifferenceExtremum | null =>
    index < 0
      ? null
      : {
          kind,
          index,
          value,
          point: {
            x: scene.projected.mx[index],
            y: scene.projected.my[index],
          },
        }

  return {
    rise: result('max-rise', riseIndex, riseValue),
    reduction: result(
      'max-reduction',
      reductionIndex,
      reductionValue,
    ),
  }
}

export function formatWseExtremumLabel(
  kind: WseExtremumKind,
  value: number,
) {
  const label = kind === 'max-rise' ? 'Max WSE rise' : 'Max WSE reduction'
  const sign = value > 0 ? '+' : ''
  return `${label}: ${sign}${value.toFixed(2)} ft`
}

type H5Runtime = {
  ready: Promise<unknown>
  FS: {
    unlink(path: string): void
    writeFile(path: string, data: Uint8Array): void
  }
  File: new (path: string, mode: string) => H5File
}

let runtimePromise: Promise<H5Runtime> | null = null

function getH5Runtime() {
  if (!runtimePromise) {
    runtimePromise = import('h5wasm').then(async (module) => {
      const runtime = module as unknown as H5Runtime
      await runtime.ready
      return runtime
    })
  }
  return runtimePromise
}

type H5Node = {
  shape?: number[]
  value?: ArrayLike<number> | string
  attrs?: Record<string, { value?: unknown }>
  keys?: () => string[]
}

type H5File = {
  get(path: string): H5Node
}

type ValueCacheEntry = Float32Array | { vx: Float32Array; vy: Float32Array }

function conditionToken(text: string) {
  const existing = /(^|[^a-z0-9])(existing|ex)(?=[^a-z0-9]|$)/i.test(text)
  const proposed = /(^|[^a-z0-9])(proposed|pr|fhd)(?=[^a-z0-9]|$)/i.test(text)
  if (existing && !proposed) return 'EX' as const
  if (proposed && !existing) return 'PR' as const
  return null
}

function conditionKey(name: string, fileName: string): ConditionKey | null {
  return conditionToken(fileName) ?? conditionToken(name)
}

function conditionLabel(key: ConditionKey) {
  return key === 'EX' ? 'Existing' : 'Proposed'
}

function hasMeshGeometry(file: H5File, base: string) {
  try {
    const nodes = file.get(`${base}/Nodes/NodeLocs`)
    const elements = file.get(`${base}/Elements/Nodeids`)
    return (nodes.shape?.[1] ?? 0) >= 2 && (elements.shape?.[1] ?? 0) >= 3
  } catch {
    return false
  }
}

function findMeshGroup(file: H5File) {
  const module = file.get('2DMeshModule')
  return module.keys?.().find((key) => hasMeshGeometry(file, `2DMeshModule/${key}`))
}

function readGeometry(file: H5File): Geometry {
  const meshName = findMeshGroup(file)
  if (!meshName) {
    throw new Error(
      'No SMS mesh group with Nodes/NodeLocs and Elements/Nodeids was found.',
    )
  }

  const base = `2DMeshModule/${meshName}`
  const nodeDataset = file.get(`${base}/Nodes/NodeLocs`)
  const nodeCount = nodeDataset.shape?.[0] ?? 0
  const locations = nodeDataset.value as ArrayLike<number>
  const xy = new Float64Array(nodeCount * 2)
  const z = new Float32Array(nodeCount)

  for (let index = 0; index < nodeCount; index += 1) {
    xy[index * 2] = locations[index * 3]
    xy[index * 2 + 1] = locations[index * 3 + 1]
    z[index] = locations[index * 3 + 2]
  }

  const elementDataset = file.get(`${base}/Elements/Nodeids`)
  const elementValues = elementDataset.value as ArrayLike<number>
  const elementCount = elementDataset.shape?.[0] ?? 0
  const elementWidth = elementDataset.shape?.[1] ?? 0
  const triangleIds: number[] = []

  for (let element = 0; element < elementCount; element += 1) {
    const ids: number[] = []
    for (let position = 0; position < elementWidth; position += 1) {
      const id = elementValues[element * elementWidth + position]
      if (id > 0) ids.push(id - 1)
    }
    if (ids.length >= 3) triangleIds.push(ids[0], ids[1], ids[2])
    if (ids.length === 4) triangleIds.push(ids[0], ids[2], ids[3])
  }

  let wkt: string | null = null
  try {
    const raw = file.get(`${base}/Coordinates`).attrs?.WKT?.value
    wkt = raw == null ? null : String(raw)
  } catch {
    wkt = null
  }

  return {
    meshName,
    N: nodeCount,
    xy,
    z,
    tris: new Uint32Array(triangleIds),
    wkt,
  }
}

function isGeometryFile(file: H5File) {
  try {
    return Boolean(findMeshGroup(file))
  } catch {
    return false
  }
}

function readDatasets(file: H5File): DatasetCatalog {
  const datasetRoot = file.get('Datasets')
  const runs: DatasetRun[] = []

  for (const name of datasetRoot.keys?.() ?? []) {
    if (name === 'Z' || name === 'Guid') continue
    const runGroup = file.get(`Datasets/${name}`)
    if (!runGroup.keys) continue
    const params: DatasetRun['params'] = {}

    for (const paramName of runGroup.keys()) {
      const paramGroup = file.get(`Datasets/${name}/${paramName}`)
      if (!paramGroup.keys?.().includes('Values')) continue
      const shape = file.get(`Datasets/${name}/${paramName}/Values`).shape ?? []
      params[paramName] = { shape, vector: shape.length === 3 }
    }

    if (Object.keys(params).length > 0) runs.push({ name, params })
  }

  return { runs }
}

function isDatasetsFile(file: H5File) {
  try {
    return (
      file
        .get('Datasets')
        .keys?.()
        .some((key) => key !== 'Z' && key !== 'Guid') ?? false
    )
  } catch {
    return false
  }
}

function boundsFromArrays(x: Float64Array, y: Float64Array): Bounds {
  let x0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  for (let index = 0; index < x.length; index += 1) {
    x0 = Math.min(x0, x[index])
    x1 = Math.max(x1, x[index])
    y0 = Math.min(y0, y[index])
    y1 = Math.max(y1, y[index])
  }
  return { x0, x1, y0, y1 }
}

function boundsFromXy(xy: Float64Array): Bounds {
  let x0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let y0 = Number.POSITIVE_INFINITY
  let y1 = Number.NEGATIVE_INFINITY
  for (let index = 0; index < xy.length / 2; index += 1) {
    x0 = Math.min(x0, xy[index * 2])
    x1 = Math.max(x1, xy[index * 2])
    y0 = Math.min(y0, xy[index * 2 + 1])
    y1 = Math.max(y1, xy[index * 2 + 1])
  }
  return { x0, x1, y0, y1 }
}

function projectGeometry(geometry: Geometry): ProjectedGeometry {
  if (!geometry.wkt) {
    throw new Error(
      `${geometry.meshName} does not include a coordinate-system WKT definition.`,
    )
  }

  const transform = proj4(geometry.wkt, 'WGS84')
  const lon = new Float64Array(geometry.N)
  const lat = new Float64Array(geometry.N)
  const mx = new Float64Array(geometry.N)
  const my = new Float64Array(geometry.N)
  const earthRadius = 6_378_137

  for (let index = 0; index < geometry.N; index += 1) {
    const result = transform.forward([
      geometry.xy[index * 2],
      geometry.xy[index * 2 + 1],
    ])
    lon[index] = result[0]
    lat[index] = result[1]
    mx[index] = (result[0] * Math.PI * earthRadius) / 180
    my[index] =
      Math.log(Math.tan(Math.PI / 4 + (result[1] * Math.PI) / 360)) *
      earthRadius
  }

  const bbox = boundsFromArrays(mx, my)
  const xyBbox = boundsFromXy(geometry.xy)
  const ftPerMercX =
    (xyBbox.x1 - xyBbox.x0) / (bbox.x1 - bbox.x0 || 1)
  const ftPerMercY =
    (xyBbox.y1 - xyBbox.y0) / (bbox.y1 - bbox.y0 || 1)

  return {
    ...geometry,
    lon,
    lat,
    mx,
    my,
    bbox,
    xyBbox,
    ftPerMerc: Math.abs((ftPerMercX + ftPerMercY) / 2),
  }
}

function finalTimestep(file: H5File, runName: string, paramName: string) {
  const dataset = file.get(`Datasets/${runName}/${paramName}/Values`)
  const [timeSteps, nodeCount] = dataset.shape ?? []
  const allValues = dataset.value as Float32Array
  return allValues.slice(
    (timeSteps - 1) * nodeCount,
    timeSteps * nodeCount,
  ) as Float32Array
}

function findParam(run: DatasetRun, pattern: RegExp) {
  return Object.keys(run.params).find((param) => pattern.test(param))
}

function buildIndex(projected: ProjectedGeometry) {
  if (projected.index) return projected.index
  const bbox = projected.bbox
  const cell =
    Math.max(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0) /
    Math.max(20, Math.sqrt(projected.N) / 2)
  const grid = new Map<string, number[]>()

  for (let index = 0; index < projected.N; index += 1) {
    const cellX = Math.floor((projected.mx[index] - bbox.x0) / cell)
    const cellY = Math.floor((projected.my[index] - bbox.y0) / cell)
    const key = `${cellX},${cellY}`
    const bucket = grid.get(key) ?? []
    bucket.push(index)
    grid.set(key, bucket)
  }

  projected.index = { b: bbox, cell, grid }
  return projected.index
}

function nearestNodeInfo(
  projected: ProjectedGeometry,
  mx: number,
  my: number,
) {
  const spatialIndex = buildIndex(projected)
  const cellX = Math.floor((mx - spatialIndex.b.x0) / spatialIndex.cell)
  const cellY = Math.floor((my - spatialIndex.b.y0) / spatialIndex.cell)
  let nearestIndex = -1
  let nearestDistanceSquared = Number.POSITIVE_INFINITY

  for (let radius = 0; radius <= 5; radius += 1) {
    let searched = 0
    for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
      for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
        if (Math.max(Math.abs(xOffset), Math.abs(yOffset)) !== radius) continue
        const bucket = spatialIndex.grid.get(
          `${cellX + xOffset},${cellY + yOffset}`,
        )
        if (!bucket) continue
        searched += bucket.length
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
    if (nearestIndex >= 0 && searched > 0) break
  }

  return { index: nearestIndex, distance2: nearestDistanceSquared }
}

function meshMatchToleranceSquared(projected: ProjectedGeometry) {
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
    edgeLengths[Math.floor(edgeLengths.length / 2)] ?? buildIndex(projected).cell
  const tolerance = Math.max(
    medianEdge * 2.25,
    buildIndex(projected).cell * 0.75,
  )
  projected.matchTolerance2 = tolerance * tolerance
  return projected.matchTolerance2
}

function maskedWetValues(
  values: Float32Array,
  depth: Float32Array,
  dryDepth: number,
) {
  const output = new Float32Array(values.length)
  for (let index = 0; index < values.length; index += 1) {
    output[index] =
      VALID(values[index]) &&
      VALID(depth[index]) &&
      depth[index] > dryDepth
        ? values[index]
        : -999
  }
  return output
}

function autoLegendBound(values: Float32Array) {
  let maxAbsolute = 0
  let valid = 0
  for (const value of values) {
    if (!VALID(value)) continue
    maxAbsolute = Math.max(maxAbsolute, Math.abs(value))
    valid += 1
  }
  if (valid === 0) return { maxAbs: 0.25, valid }
  const rawStep = maxAbsolute / 6
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 0.01))
  const step =
    [1, 2, 5, 10].map((factor) => factor * magnitude).find(
      (candidate) => candidate >= rawStep,
    ) ?? 10 * magnitude
  return {
    maxAbs: Math.max(0.25, Math.ceil(maxAbsolute / step) * step),
    valid,
  }
}

export function runDisplayName(name: string) {
  return String(name)
    .replace(/\(SRH-2D\)/i, '')
    .replaceAll('_', ' ')
    .trim()
}

export class HydraulicEngine {
  private readonly conditions = new Map<ConditionKey, ConditionData>()

  private readonly valueCache = new Map<string, ValueCacheEntry>()

  private fileSequence = 0

  async ingest(files: File[]) {
    const wasm = await getH5Runtime()
    const notices: IngestNotice[] = []

    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        this.fileSequence += 1
        const path = `hydraulic_${this.fileSequence}_${file.name.replace(/[^\w.]/g, '_')}`
        try {
          wasm.FS.unlink(path)
        } catch {
          // A new in-memory path normally has nothing to remove.
        }
        wasm.FS.writeFile(path, bytes)
        const h5File = new wasm.File(path, 'r')

        if (isGeometryFile(h5File)) {
          const geometry = readGeometry(h5File)
          const key = conditionKey(geometry.meshName, file.name)
          if (!key) {
            throw new Error(
              'Geometry was found, but its condition could not be identified as Existing or Proposed.',
            )
          }
          const condition = this.getCondition(key)
          condition.geometryFileName = file.name
          condition.geometry = geometry
          condition.projected = projectGeometry(geometry)
          notices.push({
            level: 'success',
            text: `${conditionLabel(key)} geometry: ${geometry.N.toLocaleString()} nodes`,
          })
        } else if (isDatasetsFile(h5File)) {
          const datasets = readDatasets(h5File)
          const key = conditionKey(datasets.runs[0]?.name ?? '', file.name)
          if (!key) {
            throw new Error(
              'Datasets were found, but their condition could not be identified as Existing or Proposed.',
            )
          }
          const condition = this.getCondition(key)
          condition.datasetFileName = file.name
          condition.datasetFile = h5File
          condition.datasets = datasets
          notices.push({
            level: 'success',
            text: `${conditionLabel(key)} datasets: ${datasets.runs.length} run${datasets.runs.length === 1 ? '' : 's'}`,
          })
        } else {
          notices.push({
            level: 'warning',
            text: `${file.name} is not an SMS geometry or datasets H5 file.`,
          })
        }
      } catch (error) {
        notices.push({
          level: 'error',
          text: `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }

    this.valueCache.clear()
    return notices
  }

  reset() {
    this.conditions.clear()
    this.valueCache.clear()
  }

  getCondition(key: ConditionKey) {
    const existing = this.conditions.get(key)
    if (existing) return existing
    const condition: ConditionData = { key }
    this.conditions.set(key, condition)
    return condition
  }

  condition(key: ConditionKey) {
    return this.conditions.get(key)
  }

  runOptions(key: ConditionKey) {
    const condition = this.conditions.get(key)
    if (!condition?.projected || !condition.datasets) return []
    return condition.datasets.runs.map((run, index) => ({
      key,
      condition,
      run,
      index,
    }))
  }

  isReady() {
    return this.runOptions('EX').length > 0 && this.runOptions('PR').length > 0
  }

  commonBounds() {
    let x0 = Number.POSITIVE_INFINITY
    let x1 = Number.NEGATIVE_INFINITY
    let y0 = Number.POSITIVE_INFINITY
    let y1 = Number.NEGATIVE_INFINITY

    for (const key of ['EX', 'PR'] as const) {
      const bbox = this.conditions.get(key)?.projected?.bbox
      if (!bbox) continue
      x0 = Math.min(x0, bbox.x0)
      x1 = Math.max(x1, bbox.x1)
      y0 = Math.min(y0, bbox.y0)
      y1 = Math.max(y1, bbox.y1)
    }

    if (!Number.isFinite(x0)) return { x0: -1, x1: 1, y0: -1, y1: 1 }
    const padX = (x1 - x0) * 0.08
    const padY = (y1 - y0) * 0.08
    return {
      x0: x0 - padX,
      x1: x1 + padX,
      y0: y0 - padY,
      y1: y1 + padY,
    }
  }

  buildWseDifference(
    existingIndex: number,
    proposedIndex: number,
    dryDepth: number,
  ): WseDifferenceScene {
    const existing = this.runOptions('EX')[existingIndex]
    const proposed = this.runOptions('PR')[proposedIndex]
    if (!existing || !proposed) {
      throw new Error('Select one Existing run and one Proposed run.')
    }

    const existingWseParam = findParam(existing.run, /Water_?Elev|WSE/i)
    const proposedWseParam = findParam(proposed.run, /Water_?Elev|WSE/i)
    const existingDepthParam = findParam(existing.run, /Water_?Depth/i)
    const proposedDepthParam = findParam(proposed.run, /Water_?Depth/i)
    if (
      !existingWseParam ||
      !proposedWseParam ||
      !existingDepthParam ||
      !proposedDepthParam
    ) {
      throw new Error(
        'Both selected runs need Water_Elev_ft and Water_Depth_ft datasets.',
      )
    }

    const existingWse = this.scalarValues(existing, existingWseParam)
    const proposedWse = this.scalarValues(proposed, proposedWseParam)
    const existingDepth = this.scalarValues(existing, existingDepthParam)
    const proposedDepth = this.scalarValues(proposed, proposedDepthParam)
    const existingProjected = existing.condition.projected
    const proposedProjected = proposed.condition.projected
    if (!existingProjected || !proposedProjected) {
      throw new Error('Both selected conditions need geometry.')
    }

    const diff = new Float32Array(existingProjected.N)
    const wetDry = new Int8Array(existingProjected.N)
    const proposedWetDry = new Int8Array(proposedProjected.N)
    const proposedWseWet = maskedWetValues(
      proposedWse,
      proposedDepth,
      dryDepth,
    )
    const existingMatchTolerance = meshMatchToleranceSquared(existingProjected)

    for (let index = 0; index < existingProjected.N; index += 1) {
      const match = nearestNodeInfo(
        proposedProjected,
        existingProjected.mx[index],
        existingProjected.my[index],
      ).index
      const existingValue = existingWse[index]
      const proposedValue = match >= 0 ? proposedWse[match] : -999
      diff[index] =
        VALID(existingValue) && VALID(proposedValue)
          ? proposedValue - existingValue
          : -999

      const existingWet =
        VALID(existingDepth[index]) && existingDepth[index] > dryDepth
      const proposedWet =
        match >= 0 &&
        VALID(proposedDepth[match]) &&
        proposedDepth[match] > dryDepth
      wetDry[index] = !existingWet && proposedWet ? 1 : existingWet && !proposedWet ? -1 : 0
    }

    for (let index = 0; index < proposedProjected.N; index += 1) {
      const match = nearestNodeInfo(
        existingProjected,
        proposedProjected.mx[index],
        proposedProjected.my[index],
      )
      const comparable =
        match.index >= 0 && match.distance2 <= existingMatchTolerance
      const existingHasResult =
        comparable && VALID(existingDepth[match.index])
      const proposedWet =
        VALID(proposedDepth[index]) && proposedDepth[index] > dryDepth
      proposedWetDry[index] = !existingHasResult && proposedWet ? 1 : 0
    }

    const legend = autoLegendBound(diff)
    return {
      existing,
      proposed,
      projected: existingProjected,
      proposedProjected,
      existingWse,
      proposedWse,
      existingDepth,
      proposedDepth,
      diff,
      wetDry,
      proposedWetDry,
      proposedWseWet,
      maxAbs: legend.maxAbs,
      validDifferenceNodes: legend.valid,
    }
  }

  private scalarValues(selection: RunSelection, paramName: string) {
    const cacheKey = `${selection.key}:${selection.index}:${paramName}`
    const cached = this.valueCache.get(cacheKey)
    if (cached instanceof Float32Array) return cached
    const file = selection.condition.datasetFile as H5File | undefined
    if (!file) throw new Error('The selected datasets file is unavailable.')
    const values = finalTimestep(file, selection.run.name, paramName)
    this.valueCache.set(cacheKey, values)
    return values
  }
}
