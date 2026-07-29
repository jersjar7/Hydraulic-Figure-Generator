import { generateWseAssessmentLines } from '../assessmentLines'
import type {
  ConditionKey,
  RunSelection,
  WseAssessmentLineCollection,
} from '../types'

type WseAssessmentInput = {
  scenarioKey: ConditionKey
  selection: RunSelection
  wse: Float32Array
  depth: Float32Array
  dryDepth: number
  interval: number
}

export function buildWseAssessmentLineCollection({
  scenarioKey,
  selection,
  wse,
  depth,
  dryDepth,
  interval,
}: WseAssessmentInput): WseAssessmentLineCollection {
  const projected = selection.condition.projected
  if (!projected) {
    throw new Error(
      `${selection.condition.label} geometry is required for assessment lines.`,
    )
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
    wse,
    depth,
    dryDepth,
    interval,
  })
}
