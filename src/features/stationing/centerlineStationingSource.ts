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
  namespace: boolean,
) {
  const ticks = generateCenterlineStationTicks(
    source.centerline,
    source.direction,
    source.startStation,
    settings,
  )
  return namespace
    ? ticks.map((tick) => ({
        ...tick,
        id: `${source.centerline.id}:${tick.id}`,
      }))
    : ticks
}

export function buildCenterlineStationingLayers(
  source: CenterlineStationingSource | null | undefined,
  settings: CenterlineStationingSettings,
  selectedLabelId: string | null = null,
): CenterlineStationLayer[] {
  if (!source) return []
  const namespace = source.centerlines.length > 1
  return source.centerlines.map((item) => ({
    centerline: item.centerline,
    direction: item.direction,
    ticks: stationTicks(item, settings, namespace),
    selectedLabelId,
  }))
}
