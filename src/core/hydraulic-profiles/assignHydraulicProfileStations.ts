import type { HydraulicProfileSection, SmsSummaryRow } from '../types'
import { formatHydraulicStation } from './smsClipboard'

export type HydraulicProfileStationAssignment = {
  sections: HydraulicProfileSection[]
  warnings: string[]
}

export function assignHydraulicProfileStations(
  sections: HydraulicProfileSection[],
  summaryRows: SmsSummaryRow[],
): HydraulicProfileStationAssignment {
  const warnings: string[] = []
  if (summaryRows.length === 0) {
    return {
      sections,
      warnings: ['No Summary Table stations are available; sections use generated names.'],
    }
  }
  const referenceSections = sections.filter(({ stationReferenceLine }) => stationReferenceLine)
  if (referenceSections.length === 0) {
    return {
      sections,
      warnings: ['Choose the ground profile used to assign Summary Table station labels.'],
    }
  }
  const rankedSections = [...referenceSections].sort((left, right) =>
    left.thalweg - right.thalweg || left.sourceIndex - right.sourceIndex,
  )
  const rankedRows = [...summaryRows].sort((left, right) => left.station - right.station)
  if (rankedSections.length !== rankedRows.length) {
    warnings.push(
      `Summary Table lists ${rankedRows.length} station${rankedRows.length === 1 ? '' : 's'}, but ${rankedSections.length} cross section${rankedSections.length === 1 ? '' : 's'} were detected. The overlap was paired by station order.`,
    )
  }
  const assignments = new Map<string, SmsSummaryRow>()
  const pairCount = Math.min(rankedSections.length, rankedRows.length)
  for (let index = 0; index < pairCount; index += 1) {
    assignments.set(rankedSections[index].id, rankedRows[index])
  }
  const assigned = sections.map((section) => {
    const row = assignments.get(section.id)
    if (!row) return section
    if (row.zMinimum != null && Math.abs(row.zMinimum - section.thalweg) > 2) {
      warnings.push(
        `Station ${formatHydraulicStation(row.station)}: Summary Z-min ${row.zMinimum.toFixed(2)} ft differs from the profile thalweg ${section.thalweg.toFixed(2)} ft. Station assignment is by thalweg order; verify the section visually.`,
      )
    }
    return {
      ...section,
      station: row.station,
      stationLabel: formatHydraulicStation(row.station),
      summaryZMinimum: row.zMinimum,
    }
  })
  assigned.sort((left, right) => {
    if (left.station != null && right.station != null) return left.station - right.station
    if (left.station != null) return -1
    if (right.station != null) return 1
    return left.sourceIndex - right.sourceIndex
  })
  return { sections: assigned, warnings }
}
