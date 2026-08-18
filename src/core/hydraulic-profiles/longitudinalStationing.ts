import { formatStation } from '../centerlineStationing'
import type {
  HydraulicLongitudinalMarker,
  SmsSummaryRow,
} from '../types'

type StationRange = {
  minimum: number
  maximum: number
}

function countStationsInRange(
  rows: readonly SmsSummaryRow[],
  range: StationRange,
  toDistance: (station: number) => number,
) {
  const padding = Math.max(5, (range.maximum - range.minimum) * 0.03)
  return rows.filter(({ station }) => {
    const distance = toDistance(station)
    return distance >= range.minimum - padding
      && distance <= range.maximum + padding
  }).length
}

export function automaticLongitudinalStationStart(
  rows: readonly SmsSummaryRow[],
) {
  if (rows.length === 0) return 0
  return Math.floor(Math.min(...rows.map(({ station }) => station)) / 100) * 100
}

export function resolveLongitudinalStationing({
  rows,
  range,
  initialStation,
}: {
  rows: readonly SmsSummaryRow[]
  range: StationRange
  initialStation: number | null
}): { stationStart: number; markers: HydraulicLongitudinalMarker[] } {
  const stationStart = initialStation ?? automaticLongitudinalStationStart(rows)
  const profileDistanceCount = countStationsInRange(rows, range, (station) => station)
  const absoluteStationCount = countStationsInRange(
    rows,
    range,
    (station) => station - stationStart,
  )
  const rowsUseProfileDistances = profileDistanceCount >= absoluteStationCount
  const padding = Math.max(5, (range.maximum - range.minimum) * 0.03)
  const markers = rows
    .map(({ station }, index) => ({
      id: `summary-station-${index}`,
      station: rowsUseProfileDistances ? station : station - stationStart,
      label: formatStation(rowsUseProfileDistances ? stationStart + station : station),
    }))
    .filter(({ station }) => station >= range.minimum - padding
      && station <= range.maximum + padding)
    .sort((left, right) => left.station - right.station)

  return { stationStart, markers }
}

export function formatLongitudinalAxisStation(
  profileDistance: number,
  stationStart: number,
) {
  return formatStation(stationStart + profileDistance)
}
