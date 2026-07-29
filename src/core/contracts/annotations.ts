import type { MapCoordinate } from './stationing'

export type AnnotationTool =
  | 'select'
  | 'text'
  | 'leader'
  | 'arrow'
  | 'line'
  | 'result'
  | 'extrema'

export type AnnotationKind = Exclude<AnnotationTool, 'select' | 'extrema'>

export type ResultLabelField =
  | 'summary'
  | 'difference'
  | 'existingWse'
  | 'proposedWse'
  | 'existingDepth'
  | 'proposedDepth'

export type WseExtremumKind = 'max-rise' | 'max-reduction'

export type MapAnnotation = {
  id: string
  kind: AnnotationKind
  points: MapCoordinate[]
  text: string
  color: string
  fillColor: string
  lineWidth: number
  fontSize: number
  rotation: number
  dashed: boolean
  background: boolean
  resultField?: ResultLabelField
  hydraulicExtremum?: WseExtremumKind
}

export type AnnotationDefaults = {
  text: string
  color: string
  fillColor: string
  lineWidth: number
  fontSize: number
  rotation: number
  dashed: boolean
  background: boolean
  resultField: ResultLabelField
}

