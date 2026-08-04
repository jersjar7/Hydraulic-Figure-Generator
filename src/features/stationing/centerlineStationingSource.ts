import { generateCenterlineStationTicks } from '../../core/centerlineStationing'
import type {
  CenterlineCandidate,
  CenterlineDirection,
  CenterlineStationLayer,
  CenterlineStationingSettings,
} from '../../core/types'

export type CenterlineStationingSource = {
  centerline: CenterlineCandidate
  direction: CenterlineDirection
  startStation: number
}

export function buildCenterlineStationingLayer(
  source: CenterlineStationingSource | null | undefined,
  settings: CenterlineStationingSettings,
  selectedLabelId: string | null = null,
): CenterlineStationLayer | undefined {
  if (!source) return undefined
  return {
    centerline: source.centerline,
    direction: source.direction,
    ticks: generateCenterlineStationTicks(
      source.centerline,
      source.direction,
      source.startStation,
      settings,
    ),
    selectedLabelId,
  }
}
