import type { RunSelection } from './hydraulic'
import type { MapCoordinate } from './stationing'

export type CrossSectionDirection = 'a-to-b' | 'b-to-a'

export type CrossSectionLine = {
  id: string
  label: string
  points: MapCoordinate[]
  direction: CrossSectionDirection
  stationLabel?: string
  source?: 'manual' | 'assessment'
  lengthFeet?: number
}

export type CrossSectionSample = {
  distance: number
  point: MapCoordinate
  baselineGround: number | null
  comparisonGround: number | null
  baselineWse: number | null
  comparisonWse: number | null
  baselineDepth: number | null
  comparisonDepth: number | null
  baselineNormalVelocity: number | null
  comparisonNormalVelocity: number | null
}

export type DischargeWeightedWse = {
  value: number | null
  discharge: number
  wetStart: number | null
  wetEnd: number | null
}

export type HydraulicCrossSectionScene = {
  baseline: RunSelection
  comparison: RunSelection
  line: CrossSectionLine
  samples: CrossSectionSample[]
  baselineAverage: DischargeWeightedWse
  comparisonAverage: DischargeWeightedWse
  wseDifference: number | null
  sampleSpacing: number
  warnings: string[]
}
