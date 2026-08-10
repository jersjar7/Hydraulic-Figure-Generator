import type { ColorRampKey } from '../colorRamps'

export const CONTOUR_MODES = [
  'class-boundaries',
  'scalar-isolines',
] as const

export type ContourMode = (typeof CONTOUR_MODES)[number]
export type StrokePattern = 'solid' | 'dashed' | 'dotted'

export type ClassificationBounds =
  | { mode: 'symmetric'; bound: number | null }
  | { mode: 'range'; minimum: number | null; maximum: number | null }

export type CartographyClassification = {
  ramp: ColorRampKey
  bounds: ClassificationBounds
  interval: number | null
}

export type ContourLineStyle = {
  color: string
  width: number
  pattern: StrokePattern
}

export type CartographyContours = ContourLineStyle & {
  visible: boolean
  mode: ContourMode
  interval: number | null
}

export type MeshLineStyle = ContourLineStyle & {
  opacity: number
}

export type CartographySettings = {
  classification: CartographyClassification
  contours: CartographyContours | null
  mesh: MeshLineStyle | null
}
