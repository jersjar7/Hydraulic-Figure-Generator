import type {
  CrossSectionLine,
  CrossSectionSample,
  HydraulicCrossSectionScene,
  RunSelection,
} from '../types'
import {
  sampleMeshCrossSection,
  type MeshCrossSectionResults,
} from './meshCrossSectionSampler'

type HydraulicCrossSectionInput = {
  baseline: RunSelection
  comparison: RunSelection
  line: CrossSectionLine
  baselineResults: MeshCrossSectionResults
  comparisonResults: MeshCrossSectionResults
  dryDepth: number
  sampleSpacing: number
}

function resampleValue(
  sourceDistance: ArrayLike<number>,
  sourceValues: (number | null)[],
  targetDistance: number,
) {
  if (sourceDistance.length === 0) return null
  let index = 1
  while (
    index < sourceDistance.length - 1 &&
    sourceDistance[index] < targetDistance
  ) {
    index += 1
  }
  const before = Math.max(0, index - 1)
  const after = Math.min(sourceDistance.length - 1, index)
  const first = sourceValues[before]
  const second = sourceValues[after]
  if (first == null || second == null) return null
  const span = sourceDistance[after] - sourceDistance[before]
  const fraction =
    span > 0 ? (targetDistance - sourceDistance[before]) / span : 0
  return first + (second - first) * Math.max(0, Math.min(1, fraction))
}

export function buildHydraulicCrossSectionScene({
  baseline,
  comparison,
  line,
  baselineResults,
  comparisonResults,
  dryDepth,
  sampleSpacing,
}: HydraulicCrossSectionInput): HydraulicCrossSectionScene {
  const baselineGeometry = baseline.condition.projected
  const comparisonGeometry = comparison.condition.projected
  if (!baselineGeometry || !comparisonGeometry) {
    throw new Error('Both selected scenarios need geometry.')
  }
  const directedPoints =
    line.direction === 'b-to-a' ? [...line.points].reverse() : line.points
  const baselineSection = sampleMeshCrossSection(
    baselineGeometry,
    directedPoints,
    baselineResults,
    dryDepth,
    sampleSpacing,
  )
  const comparisonSection = sampleMeshCrossSection(
    comparisonGeometry,
    directedPoints,
    comparisonResults,
    dryDepth,
    sampleSpacing,
  )
  const targetLength = Math.max(
    baselineSection.distance.at(-1) ?? 0,
    comparisonSection.distance.at(-1) ?? 0,
  )
  const sampleCount = Math.max(
    baselineSection.points.length,
    comparisonSection.points.length,
  )
  const samples: CrossSectionSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const distance = sampleCount > 1 ? (targetLength * index) / (sampleCount - 1) : 0
    const point =
      baselineSection.points[
        Math.round(
          (index * (baselineSection.points.length - 1)) /
            Math.max(1, sampleCount - 1),
        )
      ] ?? directedPoints[0]
    samples.push({
      distance,
      point,
      baselineGround: resampleValue(
        baselineSection.distance,
        baselineSection.ground,
        distance,
      ),
      comparisonGround: resampleValue(
        comparisonSection.distance,
        comparisonSection.ground,
        distance,
      ),
      baselineWse: resampleValue(
        baselineSection.distance,
        baselineSection.wse,
        distance,
      ),
      comparisonWse: resampleValue(
        comparisonSection.distance,
        comparisonSection.wse,
        distance,
      ),
      baselineDepth: resampleValue(
        baselineSection.distance,
        baselineSection.depth,
        distance,
      ),
      comparisonDepth: resampleValue(
        comparisonSection.distance,
        comparisonSection.depth,
        distance,
      ),
      baselineNormalVelocity: resampleValue(
        baselineSection.distance,
        baselineSection.normalVelocity,
        distance,
      ),
      comparisonNormalVelocity: resampleValue(
        comparisonSection.distance,
        comparisonSection.normalVelocity,
        distance,
      ),
    })
  }

  const warnings: string[] = []
  if (!baselineResults.velocity) {
    warnings.push(
      `${baseline.condition.label} does not include vector velocity; its discharge-weighted average WSE is unavailable.`,
    )
  }
  if (!comparisonResults.velocity) {
    warnings.push(
      `${comparison.condition.label} does not include vector velocity; its discharge-weighted average WSE is unavailable.`,
    )
  }
  if (samples.every((sample) => sample.baselineGround == null)) {
    warnings.push('The line does not intersect the Baseline mesh.')
  }
  if (samples.every((sample) => sample.comparisonGround == null)) {
    warnings.push('The line does not intersect the Comparison mesh.')
  }

  return {
    baseline,
    comparison,
    line,
    samples,
    baselineAverage: baselineSection.average,
    comparisonAverage: comparisonSection.average,
    wseDifference:
      baselineSection.average.value != null &&
      comparisonSection.average.value != null
        ? comparisonSection.average.value - baselineSection.average.value
        : null,
    sampleSpacing,
    warnings,
  }
}
