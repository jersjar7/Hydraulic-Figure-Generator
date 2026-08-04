import type { FigureSettings } from './figureSettings'
import type {
  ProjectedGeometry,
  RunSelection,
} from './hydraulic'

export type ScalarRampKey =
  | 'topography'
  | 'depth'
  | 'velocity'
  | 'shear'
  | 'waterSurface'
  | 'froude'
  | 'dvProduct'
  | 'surcharge'

export type ScalarResultMetadata = {
  paramName: string
  label: string
  units: string
  defaultRamp: ScalarRampKey
}

export type ScalarResultOption = ScalarResultMetadata & {
  shape: number[]
}

export type PlanViewResultScene = {
  selection: RunSelection
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
}
