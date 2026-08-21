export type ConditionKey = string

export type ConditionKind = 'natural' | 'existing' | 'proposed' | 'other'

export type ScenarioRole = 'baseline' | 'comparison' | 'assessment'

export type Bounds = {
  x0: number
  x1: number
  y0: number
  y1: number
}

export type DatasetParam = {
  shape: number[]
  vector: boolean
}

export type DatasetRun = {
  name: string
  params: Record<string, DatasetParam>
}

export type DatasetCatalog = {
  runs: DatasetRun[]
}

export type Geometry = {
  meshName: string
  N: number
  xy: Float64Array
  z: Float32Array
  tris: Uint32Array
  wkt: string | null
}

export type SpatialIndex = {
  b: Bounds
  cell: number
  grid: Map<string, number[]>
}

export type ProjectedGeometry = Geometry & {
  lon: Float64Array
  lat: Float64Array
  mx: Float64Array
  my: Float64Array
  bbox: Bounds
  xyBbox: Bounds
  ftPerMerc: number
  index?: SpatialIndex
  matchTolerance2?: number
}

export type ConditionData = {
  key: ConditionKey
  label: string
  kind: ConditionKind
  geometryFileName?: string
  datasetFileName?: string
  geometry?: Geometry
  projected?: ProjectedGeometry
  projectionError?: string
  crsOverride?: string
  datasetFile?: unknown
  datasetFilePath?: string
  datasets?: DatasetCatalog
}

export type RunSelection = {
  key: ConditionKey
  condition: ConditionData
  run: DatasetRun
  index: number
}

export type IngestNotice = {
  level: 'success' | 'warning' | 'error'
  text: string
}

export type WseDifferenceScene = {
  existing: RunSelection
  proposed: RunSelection
  projected: ProjectedGeometry
  proposedProjected: ProjectedGeometry
  existingWse: Float32Array
  proposedWse: Float32Array
  existingDepth: Float32Array
  proposedDepth: Float32Array
  diff: Float32Array
  wetDry: Int8Array
  proposedWetDry: Int8Array
  proposedWseWet: Float32Array
  maxAbs: number
  validDifferenceNodes: number
}
