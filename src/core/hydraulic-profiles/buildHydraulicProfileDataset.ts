import type {
  HydraulicProfileDataset,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileDatasetDefinition,
  HydraulicProfileLine,
  HydraulicProfileSection,
  SmsProfileSeries,
  SmsSummaryRow,
} from '../contracts/hydraulicProfile'
import { formatHydraulicStation } from './smsClipboard'

type BuildOptions = {
  datasetConfiguration?: HydraulicProfileDatasetConfiguration | null
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

export function createHydraulicProfileDatasetConfiguration(
  datasetsPerSection: number,
): HydraulicProfileDatasetConfiguration {
  const count = Math.max(1, Math.floor(datasetsPerSection))
  return {
    datasetsPerSection: count,
    definitions: Array.from({ length: count }, (_, slot) => ({
      slot,
      name: `Dataset ${slot + 1}`,
      kind: 'other' as const,
    })),
    stationReferenceSlot: null,
  }
}

export function resizeHydraulicProfileDatasetConfiguration(
  configuration: HydraulicProfileDatasetConfiguration | null,
  datasetsPerSection: number,
) {
  const next = createHydraulicProfileDatasetConfiguration(datasetsPerSection)
  if (!configuration) return next
  next.definitions = next.definitions.map((definition) => {
    const existing = configuration.definitions.find(({ slot }) => slot === definition.slot)
    return existing ? { ...existing } : definition
  })
  next.stationReferenceSlot = configuration.stationReferenceSlot != null
    && configuration.stationReferenceSlot < next.datasetsPerSection
    ? configuration.stationReferenceSlot
    : null
  return next
}

export function inferHydraulicProfileDatasetCount(
  seriesCount: number,
  summaryRowCount: number,
) {
  if (seriesCount < 1 || summaryRowCount < 1 || seriesCount % summaryRowCount !== 0) {
    return null
  }
  const count = seriesCount / summaryRowCount
  return Number.isInteger(count) && count > 0 ? count : null
}

function validConfiguration(configuration: HydraulicProfileDatasetConfiguration) {
  const { datasetsPerSection, definitions, stationReferenceSlot } = configuration
  const slots = definitions.map(({ slot }) => slot)
  return (
    Number.isInteger(datasetsPerSection) &&
    datasetsPerSection > 0 &&
    definitions.length === datasetsPerSection &&
    new Set(slots).size === datasetsPerSection &&
    slots.every((slot) => Number.isInteger(slot) && slot >= 0 && slot < datasetsPerSection) &&
    definitions.every(({ name, kind }) => typeof name === 'string' && ['ground', 'wse', 'other'].includes(kind)) &&
    (stationReferenceSlot == null || slots.includes(stationReferenceSlot))
  )
}

function line(
  series: SmsProfileSeries,
  definition: HydraulicProfileDatasetDefinition,
): HydraulicProfileLine {
  return {
    ...series,
    datasetSlot: definition.slot,
    name: definition.name.trim() || `Dataset ${definition.slot + 1}`,
    kind: definition.kind,
  }
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
  const rankedRows = [...summaryRows].sort((a, b) => a.station - b.station)
  const referenceSections = sections.filter((section) => section.stationReferenceLine)
  if (referenceSections.length === 0) {
    warnings.push('Choose the dataset used for station matching before assigning Summary Table stations.')
    return
  }
  if (referenceSections.length !== rankedRows.length) {
    warnings.push(
      `Summary Table lists ${rankedRows.length} station${rankedRows.length === 1 ? '' : 's'}, but ${referenceSections.length} cross section${referenceSections.length === 1 ? '' : 's'} were detected. Only the closest Z-min matches were paired.`,
    )
  }
  const candidates = referenceSections.flatMap((section) => rankedRows.flatMap((row) =>
    row.zMinimum == null
      ? []
      : [{ section, row, difference: Math.abs(row.zMinimum - section.thalweg) }],
  )).sort((a, b) => a.difference - b.difference)
  const assignedSections = new Set<string>()
  const assignedRows = new Set<SmsSummaryRow>()
  for (const { section, row, difference } of candidates) {
    if (assignedSections.has(section.id) || assignedRows.has(row)) continue
    assignedSections.add(section.id)
    assignedRows.add(row)
    section.station = row.station
    section.stationLabel = formatHydraulicStation(row.station)
    section.summaryZMinimum = row.zMinimum
    if (difference > 2) {
      warnings.push(
        `Station ${section.stationLabel}: Summary Z-min ${row.zMinimum!.toFixed(2)} ft differs from the profile thalweg ${section.thalweg.toFixed(2)} ft.`,
      )
    }
  }
  if (assignedSections.size < Math.min(referenceSections.length, rankedRows.length)) {
    warnings.push('Some Summary Table rows do not include a usable Z-min, so they could not be paired automatically.')
  }
}

export function buildHydraulicProfileDataset(
  series: SmsProfileSeries[],
  summaryRows: SmsSummaryRow[],
  options: BuildOptions,
): HydraulicProfileDataset {
  const inferredDatasetsPerSection = inferHydraulicProfileDatasetCount(
    series.length,
    summaryRows.length,
  )
  const requestedConfiguration = options.datasetConfiguration
  const structureSource = requestedConfiguration
    ? 'configured' as const
    : inferredDatasetsPerSection != null
      ? 'summary' as const
      : 'unresolved' as const
  const datasetsPerSection = requestedConfiguration?.datasetsPerSection
    ?? inferredDatasetsPerSection
    ?? 0
  const warnings: string[] = []
  if (datasetsPerSection < 1) {
    return {
      sections: [],
      warnings: series.length > 0
        ? ['Enter how many datasets were pasted for each cross section.']
        : [],
      seriesCount: series.length,
      datasetsPerSection,
      inferredDatasetsPerSection,
      structureSource,
      configuration: null,
    }
  }
  const fallbackConfiguration = createHydraulicProfileDatasetConfiguration(datasetsPerSection)
  const configuration = requestedConfiguration && validConfiguration(requestedConfiguration)
    ? requestedConfiguration
    : fallbackConfiguration
  if (requestedConfiguration && configuration !== requestedConfiguration) {
    warnings.push('The saved dataset definitions were invalid, so blank definitions were restored.')
  }
  if (series.length % datasetsPerSection !== 0) {
    warnings.push(
      `The profile paste contains ${series.length} series, which is not divisible by ${datasetsPerSection} datasets per section. Check the dataset count and paste.`,
    )
  }
  const sectionCount = Math.floor(series.length / datasetsPerSection)
  const sections: HydraulicProfileSection[] = []
  for (let sourceIndex = 0; sourceIndex < sectionCount; sourceIndex += 1) {
    const group = series.slice(
      sourceIndex * datasetsPerSection,
      (sourceIndex + 1) * datasetsPerSection,
    )
    const lines = configuration.definitions
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((definition) => line(group[definition.slot], definition))
    const grounds = lines.filter(({ kind }) => kind === 'ground')
    const surfaces = lines.filter(({ kind }) => kind === 'wse')
    const otherLines = lines.filter(({ kind }) => kind === 'other')
    const stationReferenceLine = configuration.stationReferenceSlot == null
      ? null
      : lines.find(({ datasetSlot }) => datasetSlot === configuration.stationReferenceSlot) ?? null
    const primaryGround = stationReferenceLine?.kind === 'ground'
      ? stationReferenceLine
      : grounds[0] ?? null
    const thalwegLine = stationReferenceLine ?? primaryGround ?? lines[0]
    sections.push({
      id: `profile-section-${sourceIndex + 1}`,
      sourceIndex,
      station: null,
      stationLabel: `Section ${sourceIndex + 1}`,
      summaryZMinimum: null,
      thalweg: minimum(thalwegLine),
      sourceSeries: group,
      lines,
      grounds,
      surfaces,
      otherLines,
      primaryGround,
      stationReferenceLine,
    })
  }
  assignStations(sections, summaryRows, warnings)
  sections.sort((a, b) => {
    if (a.station != null && b.station != null) return a.station - b.station
    if (a.station != null) return -1
    if (b.station != null) return 1
    return a.sourceIndex - b.sourceIndex
  })
  return {
    sections,
    warnings,
    seriesCount: series.length,
    datasetsPerSection,
    inferredDatasetsPerSection,
    structureSource,
    configuration,
  }
}
