import type {
  Bounds,
  FigureSettings,
  MapCoordinate,
  ProjectedGeometry,
  ResultLabelField,
  WseDifferenceScene,
} from '../types'
import { FRAMES, makeMapView } from './view'

const VALID = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

export type HydraulicResultSample = {
  baselineLabel: string
  comparisonLabel: string
  existingWse: number | null
  proposedWse: number | null
  difference: number | null
  existingDepth: number | null
  proposedDepth: number | null
}

function nearestNode(
  geometry: ProjectedGeometry,
  point: MapCoordinate,
) {
  let nearestIndex = -1
  let nearestDistance2 = Number.POSITIVE_INFINITY
  for (let index = 0; index < geometry.N; index += 1) {
    const dx = geometry.mx[index] - point.x
    const dy = geometry.my[index] - point.y
    const distance2 = dx * dx + dy * dy
    if (distance2 < nearestDistance2) {
      nearestDistance2 = distance2
      nearestIndex = index
    }
  }
  return { index: nearestIndex, distance2: nearestDistance2 }
}

const validResult = (value: number | undefined) =>
  value != null && VALID(value) ? value : null

export function sampleHydraulicResult(
  scene: WseDifferenceScene,
  bounds: Bounds,
  settings: FigureSettings,
  point: MapCoordinate,
): HydraulicResultSample | null {
  const view = makeMapView(
    bounds,
    FRAMES[settings.orientation],
    settings,
  )
  const existing = nearestNode(scene.projected, point)
  const proposed = nearestNode(scene.proposedProjected, point)
  const tolerance2 = (45 / view.scale) ** 2
  const existingNear = existing.distance2 <= tolerance2
  const proposedNear = proposed.distance2 <= tolerance2
  if (!existingNear && !proposedNear) return null

  return {
    baselineLabel: scene.existing.condition.label,
    comparisonLabel: scene.proposed.condition.label,
    existingWse: existingNear
      ? validResult(scene.existingWse[existing.index])
      : null,
    proposedWse: proposedNear
      ? validResult(scene.proposedWse[proposed.index])
      : null,
    difference: existingNear
      ? validResult(scene.diff[existing.index])
      : null,
    existingDepth: existingNear
      ? validResult(scene.existingDepth[existing.index])
      : null,
    proposedDepth: proposedNear
      ? validResult(scene.proposedDepth[proposed.index])
      : null,
  }
}

function formattedResult(value: number | null, signed = false) {
  if (value == null) return 'No result'
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} ft`
}

export function formatHydraulicResultLabel(
  field: ResultLabelField,
  sample: HydraulicResultSample,
) {
  if (field === 'difference') {
    return `WSE difference: ${formattedResult(sample.difference, true)}`
  }
  if (field === 'existingWse') {
    return `${sample.baselineLabel} WSE: ${formattedResult(sample.existingWse)}`
  }
  if (field === 'proposedWse') {
    return `${sample.comparisonLabel} WSE: ${formattedResult(sample.proposedWse)}`
  }
  if (field === 'existingDepth') {
    return `${sample.baselineLabel} depth: ${formattedResult(sample.existingDepth)}`
  }
  if (field === 'proposedDepth') {
    return `${sample.comparisonLabel} depth: ${formattedResult(sample.proposedDepth)}`
  }
  return [
    `${sample.baselineLabel} WSE: ${formattedResult(sample.existingWse)}`,
    `${sample.comparisonLabel} WSE: ${formattedResult(sample.proposedWse)}`,
    `Difference: ${formattedResult(sample.difference, true)}`,
  ].join('\n')
}
