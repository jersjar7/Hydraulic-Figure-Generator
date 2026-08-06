import type {
  HydraulicProfileDataset,
  HydraulicProfileDatasetConfiguration,
  SmsProfileSeries,
  SmsSummaryRow,
} from '../contracts/hydraulicProfile'
import { analyzeHydraulicProfileStationReferences } from './analyzeStationReferences'
import { assignHydraulicProfileStations } from './assignHydraulicProfileStations'
import { buildHydraulicProfileSection } from './buildHydraulicProfileSection'
import { groupHydraulicProfileSeries } from './groupHydraulicProfileSeries'
import { resolveHydraulicProfileMapping } from './resolveHydraulicProfileMapping'

type BuildOptions = {
  datasetConfiguration?: HydraulicProfileDatasetConfiguration | null
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
      mappingStatus: {
        ready: false,
        referenceSlot: null,
        recommendedSlot: null,
        source: 'unresolved',
        message: 'Enter how many datasets were pasted for each cross section.',
      },
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
  const referenceScores = analyzeHydraulicProfileStationReferences(
    series,
    summaryRows,
    datasetsPerSection,
  )
  const mappingStatus = resolveHydraulicProfileMapping(configuration, referenceScores)
  const bestReferenceScore = referenceScores.find(
    ({ slot }) => slot === mappingStatus.recommendedSlot,
  )
  if (
    configuration.stationReferenceSlot != null
    && bestReferenceScore
    && configuration.stationReferenceSlot !== bestReferenceScore.slot
  ) {
    warnings.push(
      `Dataset ${bestReferenceScore.slot + 1} is the lowest profile in ${bestReferenceScore.lowestSectionCount} of ${bestReferenceScore.sectionCount} sections, but Dataset ${configuration.stationReferenceSlot + 1} was explicitly selected for station ordering.`,
    )
  }
  if (mappingStatus.message) warnings.push(mappingStatus.message)
  const groupedSeries = groupHydraulicProfileSeries(series, datasetsPerSection)
  const builtSections = groupedSeries.map((group, sourceIndex) =>
    buildHydraulicProfileSection({
      group,
      definitions: configuration.definitions,
      sourceIndex,
      stationReferenceSlot: mappingStatus.referenceSlot,
    }),
  )
  const assignment = assignHydraulicProfileStations(builtSections, summaryRows)
  warnings.push(...assignment.warnings)
  return {
    sections: assignment.sections,
    warnings,
    seriesCount: series.length,
    datasetsPerSection,
    inferredDatasetsPerSection,
    structureSource,
    configuration,
    mappingStatus,
  }
}
