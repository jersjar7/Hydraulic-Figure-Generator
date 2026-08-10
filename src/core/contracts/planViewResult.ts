import type { FigureSettings } from './figureSettings'
import type { ScalarColorRampKey } from '../colorRamps'
import type { StrokePattern } from './cartography'
import type {
  ConditionData,
  ProjectedGeometry,
  RunSelection,
} from './hydraulic'

export const PLAN_VIEW_TOPOGRAPHY_ID = '__topography__'
export const PLAN_VIEW_MESH_ELEMENTS_ID = '__mesh_elements__'
export const PLAN_VIEW_TOPOGRAPHY_MESH_ID = '__topography_mesh_elements__'

export type PlanViewOutputKind =
  | 'scalar'
  | 'topography'
  | 'mesh-elements'
  | 'topography-mesh-elements'

export type PlanViewGeometryOutputId =
  | typeof PLAN_VIEW_TOPOGRAPHY_ID
  | typeof PLAN_VIEW_MESH_ELEMENTS_ID
  | typeof PLAN_VIEW_TOPOGRAPHY_MESH_ID

export type ScalarRampKey = ScalarColorRampKey

export type ScalarResultMetadata = {
  paramName: string
  label: string
  units: string
  defaultRamp: ScalarRampKey
}

export type ScalarResultOption = ScalarResultMetadata & {
  shape: number[]
}

export type PlanViewOutputOption = ScalarResultOption & {
  kind: PlanViewOutputKind
  runDependent: boolean
}

export type PlanViewResultScene = {
  condition: ConditionData
  selection: RunSelection | null
  outputKind: PlanViewOutputKind
  projected: ProjectedGeometry
  result: ScalarResultMetadata
  values: Float32Array
  validMin: number
  validMax: number
  autoMin: number
  autoMax: number
  autoInterval: number
  validNodes: number
}

export type PlanViewResultSettings = FigureSettings & {
  resultParameter: string
  ramp: ScalarRampKey
  legendMin: number | null
  legendMax: number | null
  scalarLegendInterval: number | null
  showContours: boolean
  contourInterval: number | null
  contourColor: string
  contourWidth: number
  contourPattern: StrokePattern
  meshLineColor: string
  meshLineWidth: number
  meshLineOpacity: number
  meshLinePattern: StrokePattern
}
