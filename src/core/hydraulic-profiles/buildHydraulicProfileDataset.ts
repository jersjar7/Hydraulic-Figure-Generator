import type {
  HydraulicProfileDataset,
  HydraulicProfileDatasetMapping,
  HydraulicProfileLine,
  HydraulicProfileSection,
  SmsProfileSeries,
  SmsSummaryRow,
} from '../contracts/hydraulicProfile'
import { formatHydraulicStation } from './smsClipboard'

type BuildOptions = {
  conditionLabel: string
  eventNames: string[]
  datasetMapping?: HydraulicProfileDatasetMapping | null
}

function validElevations(series: SmsProfileSeries) {
  return series.elevations.filter(
    (value): value is number => value != null && Number.isFinite(value),
  )
}

function minimum(series: SmsProfileSeries) {
  const values = validElevations(series)
  return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY
}

function mean(series: SmsProfileSeries) {
  const values = validElevations(series)
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : Number.POSITIVE_INFINITY
}

function isValidMapping(
  mapping: HydraulicProfileDatasetMapping,
  datasetsPerSection: number,
) {
  const slots = [mapping.groundSlot, ...mapping.surfaceSlots]
  return (
    slots.length === datasetsPerSection &&
    new Set(slots).size === datasetsPerSection &&
    slots.every((slot) => Number.isInteger(slot) && slot >= 0 && slot < datasetsPerSection)
  )
}

export function suggestHydraulicProfileDatasetMapping(
  series: SmsProfileSeries[],
  eventCount: number,
): HydraulicProfileDatasetMapping | null {
  const datasetsPerSection = eventCount + 1
  if (eventCount < 1 || series.length < datasetsPerSection) return null
  const group = series.slice(0, datasetsPerSection)
  const groundSlot = group.reduce(
    (best, candidate, index) =>
      minimum(candidate) < minimum(group[best]) ? index : best,
    0,
  )
  const surfaceSlots = group
    .map((item, slot) => ({ item, slot }))
    .filter(({ slot }) => slot !== groundSlot)
    .sort((a, b) => mean(a.item) - mean(b.item))
    .map(({ slot }) => slot)
  return { groundSlot, surfaceSlots }
}

function groundLabel(conditionLabel: string) {
  const condition = conditionLabel
    .replace(/\s*conditions?\s*/i, ' ')
    .trim()
  return `${condition ? `${condition} ` : ''}Ground`
}

function line(
  series: SmsProfileSeries,
  name: string,
  kind: HydraulicProfileLine['kind'],
): HydraulicProfileLine {
  return { ...series, name, kind }
}

function assignStations(
  sections: HydraulicProfileSection[],
  summaryRows: SmsSummaryRow[],
  warnings: string[],
) {
  if (summaryRows.length === 0) {
    warnings.push('No Summary Table stations are available; sections use generated names.')
    return
  }
  const rankedSections = [...sections].sort((a, b) => a.thalweg - b.thalweg)
  const rankedRows = [...summaryRows].sort((a, b) => a.station - b.station)
  if (rankedSections.length !== rankedRows.length) {
    warnings.push(
      `Summary Table lists ${rankedRows.length} station${rankedRows.length === 1 ? '' : 's'}, but ${rankedSections.length} cross section${rankedSections.length === 1 ? '' : 's'} were detected. The overlap was paired by station order.`,
    )
  }
  const count = Math.min(rankedSections.length, rankedRows.length)
  for (let index = 0; index < count; index += 1) {
    const section = rankedSections[index]
    const row = rankedRows[index]
    section.station = row.station
    section.stationLabel = formatHydraulicStation(row.station)
    section.summaryZMinimum = row.zMinimum
    if (
      row.zMinimum != null &&
      Math.abs(row.zMinimum - section.thalweg) > 2
    ) {
      warnings.push(
        `Station ${section.stationLabel}: Summary Z-min ${row.zMinimum.toFixed(2)} ft differs from the profile thalweg ${section.thalweg.toFixed(2)} ft.`,
      )
    }
  }
}

export function buildHydraulicProfileDataset(
  series: SmsProfileSeries[],
  summaryRows: SmsSummaryRow[],
  options: BuildOptions,
): HydraulicProfileDataset {
  const eventNames = options.eventNames.map((name, index) =>
    name.trim() || `Event ${index + 1}`,
  )
  const datasetsPerSection = eventNames.length + 1
  const warnings: string[] = []
  if (eventNames.length === 0) {
    return {
      sections: [],
      warnings: ['Add at least one WSE event before reviewing the profile.'],
      datasetsPerSection,
      eventNames,
      mapping: null,
    }
  }
  if (series.length % datasetsPerSection !== 0) {
    warnings.push(
      `The profile paste contains ${series.length} datasets, which is not divisible by ${datasetsPerSection} datasets per section. Check the event list and paste.`,
    )
  }
  const sectionCount = Math.floor(series.length / datasetsPerSection)
  const suggestedMapping = suggestHydraulicProfileDatasetMapping(
    series,
    eventNames.length,
  )
  const requestedMapping = options.datasetMapping ?? suggestedMapping
  const mapping = requestedMapping && isValidMapping(requestedMapping, datasetsPerSection)
    ? requestedMapping
    : suggestedMapping
  if (options.datasetMapping && mapping !== options.datasetMapping) {
    warnings.push('The saved profile dataset mapping was invalid, so a new mapping was suggested.')
  }
  const sections: HydraulicProfileSection[] = []
  for (let sourceIndex = 0; sourceIndex < sectionCount; sourceIndex += 1) {
    const group = series.slice(
      sourceIndex * datasetsPerSection,
      (sourceIndex + 1) * datasetsPerSection,
    )
    if (!mapping) continue
    const groundIndex = mapping.groundSlot
    const ground = group[groundIndex]
    const surfaces = mapping.surfaceSlots.map((slot, index) =>
      line(group[slot], eventNames[index] ?? `Event ${index + 1}`, 'wse'),
    )
    sections.push({
      id: `profile-section-${sourceIndex + 1}`,
      sourceIndex,
      station: null,
      stationLabel: `Section ${sourceIndex + 1}`,
      summaryZMinimum: null,
      thalweg: minimum(ground),
      groundSourceIndex: groundIndex,
      sourceSeries: group,
      ground: line(ground, groundLabel(options.conditionLabel), 'ground'),
      surfaces,
    })
  }
  assignStations(sections, summaryRows, warnings)
  sections.sort((a, b) => {
    if (a.station != null && b.station != null) return a.station - b.station
    if (a.station != null) return -1
    if (b.station != null) return 1
    return a.sourceIndex - b.sourceIndex
  })
  return { sections, warnings, datasetsPerSection, eventNames, mapping }
}
