export type ConditionKey = 'EX' | 'PR'

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
  geometryFileName?: string
  datasetFileName?: string
  geometry?: Geometry
  projected?: ProjectedGeometry
  datasetFile?: unknown
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

export type OverlayStyle = {
  color: string
  width: number
  visible: boolean
}

export type GeoJsonGeometry = {
  type: string
  coordinates?: unknown
  geometries?: GeoJsonGeometry[]
}

export type GeoJsonFeature = {
  type: 'Feature'
  properties?: Record<string, unknown> | null
  geometry: GeoJsonGeometry | null
}

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
  fileName?: string
}

export type MapOverlay = OverlayStyle & {
  id: string
  name: string
  geojson: GeoJsonFeatureCollection
}

export type Anchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br'

export type ElementPosition = {
  anchor: Anchor
  offX: number
  offY: number
}

export type MapElementKey = 'title' | 'diffLegend' | 'north' | 'scale' | 'wetDry'

export type MapElementPositions = Record<MapElementKey, ElementPosition>

export type MapCoordinate = {
  x: number
  y: number
}

export type AnnotationTool =
  | 'select'
  | 'text'
  | 'leader'
  | 'arrow'
  | 'line'
  | 'marker'
  | 'result'

export type AnnotationKind = Exclude<AnnotationTool, 'select'>

export type ResultLabelField =
  | 'summary'
  | 'difference'
  | 'existingWse'
  | 'proposedWse'
  | 'existingDepth'
  | 'proposedDepth'

export type MapAnnotation = {
  id: string
  kind: AnnotationKind
  points: MapCoordinate[]
  text: string
  color: string
  fillColor: string
  lineWidth: number
  fontSize: number
  dashed: boolean
  background: boolean
  resultField?: ResultLabelField
}

export type AnnotationDefaults = {
  text: string
  color: string
  fillColor: string
  lineWidth: number
  fontSize: number
  dashed: boolean
  background: boolean
  resultField: ResultLabelField
}

export type FigureSettings = {
  orientation: 'landscape' | 'portrait'
  dryDepth: number
  differenceOutlineColor: string
  showDifferenceOutlines: boolean
  showWetDry: boolean
  showOverlays: boolean
  showTitle: boolean
  showLegend: boolean
  showNorth: boolean
  showScale: boolean
  titleTemplate: string
  legendBound: number | null
  legendInterval: number | null
  legendFontSize: number
  newlyWetColor: string
  newlyDryColor: string
  basemapOpacity: number
  rotation: number
  zoom: number
  panX: number
  panY: number
  elementPositions: MapElementPositions
}
