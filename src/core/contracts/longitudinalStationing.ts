export const LONGITUDINAL_STATION_LABEL_PLACEMENTS = [
  'auto',
  'top',
  'bottom',
] as const

export type LongitudinalStationLabelPlacement =
  (typeof LONGITUDINAL_STATION_LABEL_PLACEMENTS)[number]

export type LongitudinalStationingSettings = {
  initialStation: number | null
  labelPlacement: LongitudinalStationLabelPlacement
  avoidLabelOverlap: boolean
  staggerLabels: boolean
  labelPositions: Record<string, LongitudinalStationLabelPosition>
}

export type LongitudinalStationLabelPosition = {
  offsetX: number
  offsetY: number
}

export function createDefaultLongitudinalStationingSettings(): LongitudinalStationingSettings {
  return {
    initialStation: null,
    labelPlacement: 'auto',
    avoidLabelOverlap: true,
    staggerLabels: true,
    labelPositions: {},
  }
}
