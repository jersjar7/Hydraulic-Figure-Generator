import {
  findNearestNode,
  meshMatchToleranceSquared,
} from '../meshMatching'
import type {
  DatasetRun,
  RunSelection,
  WseDifferenceScene,
} from '../types'

const isValidResult = (value: number) =>
  value != null && Number.isFinite(value) && value > -900

export function findResultParam(run: DatasetRun, pattern: RegExp) {
  return Object.keys(run.params).find((param) => pattern.test(param))
}

function maskedWetValues(
  values: Float32Array,
  depth: Float32Array,
  dryDepth: number,
) {
  const output = new Float32Array(values.length)
  for (let index = 0; index < values.length; index += 1) {
    output[index] =
      isValidResult(values[index]) &&
      isValidResult(depth[index]) &&
      depth[index] > dryDepth
        ? values[index]
        : -999
  }
  return output
}

function autoLegendBound(values: Float32Array) {
  let maxAbsolute = 0
  let valid = 0
  for (const value of values) {
    if (!isValidResult(value)) continue
    maxAbsolute = Math.max(maxAbsolute, Math.abs(value))
    valid += 1
  }
  if (valid === 0) return { maxAbs: 0.25, valid }
  const rawStep = maxAbsolute / 6
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 0.01))
  const step =
    [1, 2, 5, 10].map((factor) => factor * magnitude).find(
      (candidate) => candidate >= rawStep,
    ) ?? 10 * magnitude
  return {
    maxAbs: Math.max(0.25, Math.ceil(maxAbsolute / step) * step),
    valid,
  }
}

type WseDifferenceInput = {
  existing: RunSelection
  proposed: RunSelection
  existingWse: Float32Array
  proposedWse: Float32Array
  existingDepth: Float32Array
  proposedDepth: Float32Array
  dryDepth: number
}

export function buildWseDifferenceScene({
  existing,
  proposed,
  existingWse,
  proposedWse,
  existingDepth,
  proposedDepth,
  dryDepth,
}: WseDifferenceInput): WseDifferenceScene {
  const existingProjected = existing.condition.projected
  const proposedProjected = proposed.condition.projected
  if (!existingProjected || !proposedProjected) {
    throw new Error('Both selected scenarios need geometry.')
  }
  if (
    existingWse.length !== existingProjected.N ||
    existingDepth.length !== existingProjected.N ||
    proposedWse.length !== proposedProjected.N ||
    proposedDepth.length !== proposedProjected.N
  ) {
    throw new Error(
      'Geometry and result datasets have different node counts. Replace the mismatched condition inputs.',
    )
  }

  const diff = new Float32Array(existingProjected.N)
  const wetDry = new Int8Array(existingProjected.N)
  const proposedWetDry = new Int8Array(proposedProjected.N)
  const proposedWseWet = maskedWetValues(proposedWse, proposedDepth, dryDepth)
  const existingMatchTolerance = meshMatchToleranceSquared(existingProjected)
  const proposedMatchTolerance = meshMatchToleranceSquared(proposedProjected)

  for (let index = 0; index < existingProjected.N; index += 1) {
    const match = findNearestNode(
      proposedProjected,
      existingProjected.mx[index],
      existingProjected.my[index],
    )
    const comparable =
      match.index >= 0 && match.distance2 <= proposedMatchTolerance
    const existingValue = existingWse[index]
    const proposedValue = comparable ? proposedWse[match.index] : -999
    diff[index] =
      isValidResult(existingValue) && isValidResult(proposedValue)
        ? proposedValue - existingValue
        : -999

    const existingWet =
      isValidResult(existingDepth[index]) && existingDepth[index] > dryDepth
    const proposedWet =
      comparable &&
      isValidResult(proposedDepth[match.index]) &&
      proposedDepth[match.index] > dryDepth
    wetDry[index] =
      !existingWet && proposedWet ? 1 : existingWet && !proposedWet ? -1 : 0
  }

  for (let index = 0; index < proposedProjected.N; index += 1) {
    const match = findNearestNode(
      existingProjected,
      proposedProjected.mx[index],
      proposedProjected.my[index],
    )
    const comparable =
      match.index >= 0 && match.distance2 <= existingMatchTolerance
    const existingHasResult =
      comparable && isValidResult(existingDepth[match.index])
    const proposedWet =
      isValidResult(proposedDepth[index]) && proposedDepth[index] > dryDepth
    proposedWetDry[index] = !existingHasResult && proposedWet ? 1 : 0
  }

  const legend = autoLegendBound(diff)
  return {
    existing,
    proposed,
    projected: existingProjected,
    proposedProjected,
    existingWse,
    proposedWse,
    existingDepth,
    proposedDepth,
    diff,
    wetDry,
    proposedWetDry,
    proposedWseWet,
    maxAbs: legend.maxAbs,
    validDifferenceNodes: legend.valid,
  }
}
