import { generateCenterlineStationTicks } from '../../core/centerlineStationing'
import type {
  CenterlineCandidate,
  CenterlineDirection,
  CenterlineStationLayer,
  CenterlineStationingSettings,
} from '../../core/types'

export type CenterlineStationingSource = {
  centerlines: Array<{
    centerline: CenterlineCandidate
    direction: CenterlineDirection
    startStation: number
  }>
}

function stationTicks(
  source: CenterlineStationingSource['centerlines'][number],
  settings: CenterlineStationingSettings,
) {
  const ticks = generateCenterlineStationTicks(
    source.centerline,
    source.direction,
    source.startStation,
    settings,
  )
  return ticks.map((tick) => ({
    ...tick,
    legacyId: tick.id,
    id: `${source.centerline.id}:${tick.id}`,
  }))
}

export function buildCenterlineStationingLayers(
  source: CenterlineStationingSource | null | undefined,
  settings: CenterlineStationingSettings,
  selectedLabelId: string | null = null,
): CenterlineStationLayer[] {
  if (!source) return []
  return source.centerlines.map((item) => ({
    centerline: item.centerline,
    direction: item.direction,
    ticks: stationTicks(item, settings),
    selectedLabelId,
    allowLegacyOverrides: source.centerlines.length === 1,
  }))
}
