import type {
  HydraulicProfileDatasetDefinition,
  HydraulicProfileLine,
  HydraulicProfileSection,
  SmsProfileSeries,
} from '../types'

function validElevations(series: SmsProfileSeries) {
  return series.elevations.filter(
    (value): value is number => value != null && Number.isFinite(value),
  )
}

export function hydraulicProfileSeriesMinimum(series: SmsProfileSeries) {
  const values = validElevations(series)
  return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY
}

function buildLine(
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

type Request = {
  group: SmsProfileSeries[]
  definitions: HydraulicProfileDatasetDefinition[]
  sourceIndex: number
  stationReferenceSlot: number | null
}

export function buildHydraulicProfileSection({
  group,
  definitions,
  sourceIndex,
  stationReferenceSlot,
}: Request): HydraulicProfileSection {
  const lines = definitions
    .slice()
    .sort((left, right) => left.slot - right.slot)
    .map((definition) => buildLine(group[definition.slot], definition))
  const grounds = lines.filter(({ kind }) => kind === 'ground')
  const surfaces = lines.filter(({ kind }) => kind === 'wse')
  const otherLines = lines.filter(({ kind }) => kind === 'other')
  const stationReferenceLine = stationReferenceSlot == null
    ? null
    : lines.find(({ datasetSlot }) => datasetSlot === stationReferenceSlot) ?? null
  const primaryGround = stationReferenceLine?.kind === 'ground'
    ? stationReferenceLine
    : grounds[0] ?? null
  const thalwegLine = stationReferenceLine ?? primaryGround ?? lines[0]
  return {
    id: `profile-section-${sourceIndex + 1}`,
    sourceIndex,
    station: null,
    stationLabel: `Section ${sourceIndex + 1}`,
    summaryZMinimum: null,
    thalweg: hydraulicProfileSeriesMinimum(thalwegLine),
    sourceSeries: group,
    lines,
    grounds,
    surfaces,
    otherLines,
    primaryGround,
    stationReferenceLine,
  }
}
