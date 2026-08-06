import type { SmsProfileSeries, SmsSummaryRow } from '../types'

export type HydraulicProfileStationReferenceScore = {
  slot: number
  meanAbsoluteDifference: number
  maximumDifference: number
  matchedSections: number
  lowestSectionCount: number
  sectionCount: number
}

function seriesMinimum(series: SmsProfileSeries | undefined) {
  const elevations = series?.elevations.filter(
    (value): value is number => value != null && Number.isFinite(value),
  ) ?? []
  return elevations.length > 0 ? Math.min(...elevations) : null
}

export function analyzeHydraulicProfileStationReferences(
  series: SmsProfileSeries[],
  summaryRows: SmsSummaryRow[],
  datasetsPerSection: number,
): HydraulicProfileStationReferenceScore[] {
  if (datasetsPerSection < 1) return []
  const summaryMinima = summaryRows
    .flatMap(({ zMinimum }) => zMinimum == null || !Number.isFinite(zMinimum) ? [] : [zMinimum])
    .sort((left, right) => left - right)
  const sectionCount = Math.floor(series.length / datasetsPerSection)
  if (sectionCount === 0) return []
  const sectionMinima = Array.from({ length: sectionCount }, (_, sectionIndex) =>
    Array.from({ length: datasetsPerSection }, (_, slot) =>
      seriesMinimum(series[sectionIndex * datasetsPerSection + slot]),
    ),
  )

  return Array.from({ length: datasetsPerSection }, (_, slot) => {
    const profileMinima = sectionMinima
      .map((minima) => minima[slot])
      .flatMap((minimum) => minimum == null ? [] : [minimum])
      .sort((left, right) => left - right)
    const matchedSections = Math.min(summaryMinima.length, profileMinima.length)
    const differences = Array.from(
      { length: matchedSections },
      (_, index) => Math.abs(summaryMinima[index] - profileMinima[index]),
    )
    return {
      slot,
      meanAbsoluteDifference: differences.length > 0
        ? differences.reduce((total, difference) => total + difference, 0) / differences.length
        : Number.POSITIVE_INFINITY,
      maximumDifference: differences.length > 0
        ? Math.max(...differences)
        : Number.POSITIVE_INFINITY,
      matchedSections,
      lowestSectionCount: sectionMinima.filter((minima) => {
        const candidate = minima[slot]
        const valid = minima.flatMap((minimum) => minimum == null ? [] : [minimum])
        return candidate != null && valid.length > 0 && candidate === Math.min(...valid)
      }).length,
      sectionCount,
    }
  }).sort((left, right) => (
    right.lowestSectionCount - left.lowestSectionCount
    || left.meanAbsoluteDifference - right.meanAbsoluteDifference
    || left.maximumDifference - right.maximumDifference
    || left.slot - right.slot
  ))
}
