import { formatStation } from '../centerlineStationing'
import type {
  HydraulicLongitudinalCulvert,
  HydraulicLongitudinalScene,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileLine,
  SmsProfileSeries,
  SmsSummaryRow,
} from '../types'

type Options = {
  conditionLabel: string
  configuration: HydraulicProfileDatasetConfiguration | null
  summaryRows: SmsSummaryRow[]
  culverts: HydraulicLongitudinalCulvert[]
}

export function buildHydraulicLongitudinalScene(
  series: SmsProfileSeries[],
  options: Options,
): HydraulicLongitudinalScene | null {
  if (series.length === 0) return null
  const warnings: string[] = []
  const configuration = options.configuration
  if (!configuration || configuration.definitions.length !== series.length) {
    warnings.push(
      `Longitudinal Profile Values contain ${series.length} series, but ${configuration?.definitions.length ?? 0} datasets are defined.`,
    )
    return {
      conditionLabel: options.conditionLabel,
      lines: [],
      grounds: [],
      surfaces: [],
      markers: [],
      culverts: options.culverts,
      warnings,
    }
  }
  const lines: HydraulicProfileLine[] = series.map((source, datasetSlot) => {
    const definition = configuration.definitions[datasetSlot]
    return { ...source, datasetSlot, name: definition.name, kind: definition.kind }
  })
  const finiteDistances = lines.flatMap(({ distances }) => distances.filter(Number.isFinite))
  const minimumDistance = finiteDistances.length > 0 ? Math.min(...finiteDistances) : 0
  const maximumDistance = finiteDistances.length > 0 ? Math.max(...finiteDistances) : 0
  const minimumStation = options.summaryRows.length > 0
    ? Math.min(...options.summaryRows.map(({ station }) => station))
    : 0
  const stationOffset = Math.floor(minimumStation / 100) * 100
  const markers = options.summaryRows
    .filter(({ station }) => station >= stationOffset + minimumDistance && station <= stationOffset + maximumDistance)
    .map(({ station }) => ({
      station: station - stationOffset,
      label: formatStation(station),
    }))
  return {
    conditionLabel: options.conditionLabel,
    lines,
    grounds: lines.filter(({ kind }) => kind === 'ground'),
    surfaces: lines.filter(({ kind }) => kind === 'wse'),
    markers,
    culverts: options.culverts,
    warnings,
  }
}
