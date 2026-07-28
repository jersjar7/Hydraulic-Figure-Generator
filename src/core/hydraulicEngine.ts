import proj4 from 'proj4'
import { generateWseAssessmentLines } from './assessmentLines'
import {
  findNearestNode,
  meshMatchToleranceSquared,
} from './meshMatching'
import type {
  Bounds,
  ConditionData,
  ConditionKind,
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
  WseAssessmentLineCollection,
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
  close(): unknown
}

type ValueCacheEntry = Float32Array | { vx: Float32Array; vy: Float32Array }

export function conditionNodeCountsMatch(condition: ConditionData) {
  if (!condition.geometry || !condition.datasets) return false
  const expected = condition.geometry.N
  const nodeCounts = condition.datasets.runs.flatMap((run) =>
    Object.values(run.params)
      .map((param) => param.shape[1])
      .filter((count): count is number => Number.isInteger(count)),
  )
  return nodeCounts.length > 0 && nodeCounts.every((count) => count === expected)
}

function conditionToken(text: string) {
  const existing = /(^|[^a-z0-9])(existing|ex)(?=[^a-z0-9]|$)/i.test(text)
  const proposed = /(^|[^a-z0-9])(proposed|pr|fhd)(?=[^a-z0-9]|$)/i.test(text)
  const natural = /(^|[^a-z0-9])(natural|na)(?=[^a-z0-9]|$)/i.test(text)
  if (existing && !proposed && !natural) {
    return { key: 'EX', label: 'Existing', kind: 'existing' } as const
  }
  if (proposed && !existing && !natural) {
    return { key: 'PR', label: 'Proposed', kind: 'proposed' } as const
  }
  if (natural && !existing && !proposed) {
    return { key: 'NA', label: 'Natural', kind: 'natural' } as const
  }
  return null
}

export type ScenarioDescriptor = {
  key: ConditionKey
  label: string
  kind: ConditionKind
}

function customScenario(text: string): ScenarioDescriptor | null {
  const stem = text.replace(/\.(h5|hdf5)$/i, '')
  const label = stem
    .replace(
      /(^|[\s_-]+)(geometry|geo|datasets?|results?|mesh|srh-?2d)(?=$|[\s_-]+)/gi,
      ' ',
    )
    .replace(/[\s_-]+/g, ' ')
    .trim()
  if (!label || /^(geometry|datasets?|results?|mesh)$/i.test(label)) return null
  const key = label
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  if (!key) return null
  return {
    key,
    label: label.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    kind: 'other',
  }
}

export function inferScenarioDescriptor(
  name: string,
  fileName: string,
): ScenarioDescriptor | null {
  return (
    conditionToken(fileName) ??
    customScenario(fileName) ??
    conditionToken(name) ??
    customScenario(name)
  )
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

  private h5Runtime: H5Runtime | null = null

  private unlinkFile(path: string | undefined) {
    if (!path || !this.h5Runtime) return
    try {
      this.h5Runtime.FS.unlink(path)
    } catch {
      // The in-memory file may already have been released.
    }
  }

  private releaseDataset(condition: ConditionData) {
    const file = condition.datasetFile as H5File | undefined
    try {
      file?.close()
    } catch {
      // Continue releasing the WASM path even if HDF5 reports a close error.
    }
    this.unlinkFile(condition.datasetFilePath)
    condition.datasetFile = undefined
    condition.datasetFilePath = undefined
    condition.datasetFileName = undefined
    condition.datasets = undefined
  }

  async ingest(files: File[]) {
    const wasm = await getH5Runtime()
    this.h5Runtime = wasm
    const notices: IngestNotice[] = []

    for (const file of files) {
      let path: string | undefined
      let h5File: H5File | undefined
      let keepFileOpen = false
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        this.fileSequence += 1
        path = `hydraulic_${this.fileSequence}_${file.name.replace(/[^\w.]/g, '_')}`
        try {
          wasm.FS.unlink(path)
        } catch {
          // A new in-memory path normally has nothing to remove.
        }
        wasm.FS.writeFile(path, bytes)
        h5File = new wasm.File(path, 'r')

        if (isGeometryFile(h5File)) {
          const geometry = readGeometry(h5File)
          const descriptor = inferScenarioDescriptor(
            geometry.meshName,
            file.name,
          )
          if (!descriptor) {
            throw new Error(
              'Geometry was found, but its scenario could not be identified. Include a shared scenario name in the geometry and datasets filenames.',
            )
          }
          const condition = this.getCondition(descriptor.key, descriptor)
          condition.geometryFileName = file.name
          condition.geometry = geometry
          condition.projected = projectGeometry(geometry)
          notices.push({
            level: 'success',
            text: `${condition.label} geometry: ${geometry.N.toLocaleString()} nodes`,
          })
        } else if (isDatasetsFile(h5File)) {
          const datasets = readDatasets(h5File)
          const descriptor = inferScenarioDescriptor(
            datasets.runs[0]?.name ?? '',
            file.name,
          )
          if (!descriptor) {
            throw new Error(
              'Datasets were found, but their scenario could not be identified. Include a shared scenario name in the geometry and datasets filenames.',
            )
          }
          const condition = this.getCondition(descriptor.key, descriptor)
          this.releaseDataset(condition)
          condition.datasetFileName = file.name
          condition.datasetFile = h5File
          condition.datasetFilePath = path
          condition.datasets = datasets
          keepFileOpen = true
          notices.push({
            level: 'success',
            text: `${condition.label} datasets: ${datasets.runs.length} run${datasets.runs.length === 1 ? '' : 's'}`,
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
      } finally {
        if (!keepFileOpen) {
          try {
            h5File?.close()
          } catch {
            // Invalid files still need their WASM path released.
          }
          this.unlinkFile(path)
        }
      }
    }

    for (const condition of this.conditions.values()) {
      if (
        condition.geometry &&
        condition.datasets &&
        !conditionNodeCountsMatch(condition)
      ) {
        notices.push({
          level: 'error',
          text: `${condition.label} geometry and datasets have different node counts. Replace the mismatched input before generating.`,
        })
      }
    }

    this.valueCache.clear()
    return notices
  }

  reset() {
    for (const condition of this.conditions.values()) {
      this.releaseDataset(condition)
    }
    this.conditions.clear()
    this.valueCache.clear()
  }

  removeCondition(key: ConditionKey) {
    const condition = this.conditions.get(key)
    if (condition) this.releaseDataset(condition)
    this.conditions.delete(key)
    this.valueCache.clear()
  }

  getCondition(
    key: ConditionKey,
    descriptor?: Pick<ConditionData, 'label' | 'kind'>,
  ) {
    const existing = this.conditions.get(key)
    if (existing) return existing
    const condition: ConditionData = {
      key,
      label: descriptor?.label ?? key,
      kind: descriptor?.kind ?? 'other',
    }
    this.conditions.set(key, condition)
    return condition
  }

  scenarios() {
    const order: Record<string, number> = { EX: 0, PR: 1, NA: 2 }
    return [...this.conditions.values()].sort(
      (first, second) =>
        (order[first.key] ?? 10) - (order[second.key] ?? 10) ||
        first.label.localeCompare(second.label),
    )
  }

  renameCondition(key: ConditionKey, label: string) {
    const condition = this.conditions.get(key)
    const nextLabel = label.trim()
    if (condition && nextLabel) condition.label = nextLabel
  }

  condition(key: ConditionKey) {
    return this.conditions.get(key)
  }

  runOptions(key: ConditionKey) {
    const condition = this.conditions.get(key)
    if (
      !condition?.projected ||
      !condition.datasets ||
      !conditionNodeCountsMatch(condition)
    ) {
      return []
    }
    return condition.datasets.runs.map((run, index) => ({
      key,
      condition,
      run,
      index,
    }))
  }

  isReady(baselineKey: ConditionKey, comparisonKey: ConditionKey) {
    return (
      baselineKey !== comparisonKey &&
      this.runOptions(baselineKey).length > 0 &&
      this.runOptions(comparisonKey).length > 0
    )
  }

  commonBounds(keys: Iterable<ConditionKey> = this.conditions.keys()) {
    let x0 = Number.POSITIVE_INFINITY
    let x1 = Number.NEGATIVE_INFINITY
    let y0 = Number.POSITIVE_INFINITY
    let y1 = Number.NEGATIVE_INFINITY

    for (const key of keys) {
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
    baselineKey: ConditionKey,
    baselineIndex: number,
    comparisonKey: ConditionKey,
    comparisonIndex: number,
    dryDepth: number,
  ): WseDifferenceScene {
    const existing = this.runOptions(baselineKey)[baselineIndex]
    const proposed = this.runOptions(comparisonKey)[comparisonIndex]
    if (!existing || !proposed) {
      throw new Error('Select one complete Baseline run and one complete Comparison run.')
    }
    if (baselineKey === comparisonKey) {
      throw new Error('Baseline and Comparison must use different scenarios.')
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
      throw new Error('Both selected scenarios need geometry.')
    }
    if (
      existingWse.length !== existingProjected.N ||
      existingDepth.length !== existingProjected.N ||
      proposedWse.length !== proposedProjected.N ||
      proposedDepth.length !== proposedProjected.N
    ) {
      throw new Error(
        'Geometry and result datasets have different node counts. Replace the mismatched condition inputs.',
      )
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
    const proposedMatchTolerance = meshMatchToleranceSquared(proposedProjected)

    for (let index = 0; index < existingProjected.N; index += 1) {
      const match = findNearestNode(
        proposedProjected,
        existingProjected.mx[index],
        existingProjected.my[index],
      )
      const comparable =
        match.index >= 0 && match.distance2 <= proposedMatchTolerance
      const existingValue = existingWse[index]
      const proposedValue = comparable ? proposedWse[match.index] : -999
      diff[index] =
        VALID(existingValue) && VALID(proposedValue)
          ? proposedValue - existingValue
          : -999

      const existingWet =
        VALID(existingDepth[index]) && existingDepth[index] > dryDepth
      const proposedWet =
        comparable &&
        VALID(proposedDepth[match.index]) &&
        proposedDepth[match.index] > dryDepth
      wetDry[index] = !existingWet && proposedWet ? 1 : existingWet && !proposedWet ? -1 : 0
    }

    for (let index = 0; index < proposedProjected.N; index += 1) {
      const match = findNearestNode(
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

  buildWseAssessmentLines(
    scenarioKey: ConditionKey,
    runIndex: number,
    dryDepth: number,
    interval: number,
  ): WseAssessmentLineCollection {
    const selection = this.runOptions(scenarioKey)[runIndex]
    const scenario = this.condition(scenarioKey)
    if (!selection || !scenario) {
      throw new Error('Select a complete assessment-source run before generating assessment lines.')
    }
    const wseParam = findParam(selection.run, /Water_?Elev|WSE/i)
    const depthParam = findParam(selection.run, /Water_?Depth/i)
    if (!wseParam || !depthParam) {
      throw new Error(
        `The selected ${scenario.label} run needs Water_Elev_ft and Water_Depth_ft datasets.`,
      )
    }
    const projected = selection.condition.projected
    if (!projected) {
      throw new Error(`${scenario.label} geometry is required for assessment lines.`)
    }
    const modelX = new Float64Array(projected.N)
    const modelY = new Float64Array(projected.N)
    for (let index = 0; index < projected.N; index += 1) {
      modelX[index] = projected.xy[index * 2]
      modelY[index] = projected.xy[index * 2 + 1]
    }
    return generateWseAssessmentLines({
      source:
        scenarioKey === 'EX'
          ? 'existing-wse'
          : `${scenarioKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-wse`,
      mapX: projected.mx,
      mapY: projected.my,
      modelX,
      modelY,
      triangles: projected.tris,
      wse: this.scalarValues(selection, wseParam),
      depth: this.scalarValues(selection, depthParam),
      dryDepth,
      interval,
    })
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
