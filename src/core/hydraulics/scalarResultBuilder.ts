import type {
  PlanViewResultScene,
  RunSelection,
} from '../types'
import { scalarResultMetadata } from './scalarResultMetadata'

const VALID_RESULT_MINIMUM = -900

function niceStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 2.5, 5, 10]
    .map((factor) => factor * magnitude)
    .reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value)
        ? candidate
        : best,
    )
}

function resultRange(values: Float32Array) {
  let validMin = Number.POSITIVE_INFINITY
  let validMax = Number.NEGATIVE_INFINITY
  let validNodes = 0
  for (const value of values) {
    if (
      !Number.isFinite(value) ||
      value <= VALID_RESULT_MINIMUM
    ) {
      continue
    }
    validMin = Math.min(validMin, value)
    validMax = Math.max(validMax, value)
    validNodes += 1
  }
  if (validNodes === 0) {
    throw new Error('The selected result has no valid final-timestep values.')
  }
  const span = Math.max(validMax - validMin, Math.abs(validMax) * 0.01, 0.01)
  const autoInterval = niceStep(span / 10)
  const autoMin = Math.floor(validMin / autoInterval) * autoInterval
  let autoMax = Math.ceil(validMax / autoInterval) * autoInterval
  if (autoMax <= autoMin) autoMax = autoMin + autoInterval
  return {
    validMin,
    validMax,
    validNodes,
    autoMin,
    autoMax,
    autoInterval,
  }
}

export function buildScalarResultScene(
  selection: RunSelection,
  paramName: string,
  values: Float32Array,
): PlanViewResultScene {
  const projected = selection.condition.projected
  const parameter = selection.run.params[paramName]
  if (!projected) throw new Error('The selected scenario needs geometry.')
  if (!parameter) {
    throw new Error(`The selected run does not include ${paramName}.`)
  }
  if (parameter.vector) {
    throw new Error(`${paramName} is a vector result, not a scalar result.`)
  }
  if (values.length !== projected.N) {
    throw new Error(
      'Geometry and result datasets have different node counts. Replace the mismatched scenario inputs.',
    )
  }
  return {
    selection,
    projected,
    result: scalarResultMetadata(paramName),
    values,
    ...resultRange(values),
  }
}
