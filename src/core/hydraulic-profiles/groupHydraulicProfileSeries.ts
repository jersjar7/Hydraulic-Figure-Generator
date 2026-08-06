import type { SmsProfileSeries } from '../types'

export function groupHydraulicProfileSeries(
  series: SmsProfileSeries[],
  datasetsPerSection: number,
) {
  if (!Number.isInteger(datasetsPerSection) || datasetsPerSection < 1) return []
  const sectionCount = Math.floor(series.length / datasetsPerSection)
  return Array.from({ length: sectionCount }, (_, sectionIndex) =>
    series.slice(
      sectionIndex * datasetsPerSection,
      (sectionIndex + 1) * datasetsPerSection,
    ),
  )
}
