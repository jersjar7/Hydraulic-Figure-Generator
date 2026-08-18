import type {
  HydraulicLongitudinalCulvert,
  HydraulicLongitudinalScene,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileLine,
  SmsProfileSeries,
  SmsSummaryRow,
} from '../types'
import { resolveLongitudinalStationing } from './longitudinalStationing'

type Options = {
  conditionLabel: string
  configuration: HydraulicProfileDatasetConfiguration | null
  summaryRows: SmsSummaryRow[]
  culverts: HydraulicLongitudinalCulvert[]
  initialStation?: number | null
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
      stationStart: options.initialStation ?? 0,
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
  const stationing = resolveLongitudinalStationing({
    rows: options.summaryRows,
    range: { minimum: minimumDistance, maximum: maximumDistance },
    initialStation: options.initialStation ?? null,
  })
  return {
    conditionLabel: options.conditionLabel,
    stationStart: stationing.stationStart,
    lines,
    grounds: lines.filter(({ kind }) => kind === 'ground'),
    surfaces: lines.filter(({ kind }) => kind === 'wse'),
    markers: stationing.markers,
    culverts: options.culverts,
    warnings,
  }
}
