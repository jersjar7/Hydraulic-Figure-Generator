import type {
  CenterlineCandidate,
  CenterlineDirection,
  CenterlineStationTick,
} from '../types'

const MAX_STATION_TICKS = 2_500
export function centerlineDistances(centerline: CenterlineCandidate) {
  const distances = new Float64Array(centerline.modelPoints.length)
  for (let index = 1; index < centerline.modelPoints.length; index += 1) {
    distances[index] =
      distances[index - 1] +
      Math.hypot(
        centerline.modelPoints[index].x -
          centerline.modelPoints[index - 1].x,
        centerline.modelPoints[index].y -
          centerline.modelPoints[index - 1].y,
      )
  }
  return distances
}

export type CenterlineStationTickOptions = {
  minorInterval: number
  majorInterval: number
  labelInterval: number
  rangeStart?: number | null
  rangeEnd?: number | null
}

function validInterval(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`)
  }
}

function stationSchedule(
  minimum: number,
  maximum: number,
  interval: number,
) {
  const first = Math.ceil((minimum - 1e-8) / interval) * interval
  const stations: number[] = []
  for (
    let station = first;
    station <= maximum + 1e-8;
    station += interval
  ) {
    stations.push(Math.round(station * 1e6) / 1e6)
    if (stations.length > MAX_STATION_TICKS) {
      throw new Error(
        `Station interval creates more than ${MAX_STATION_TICKS.toLocaleString()} marks. Increase the interval or shorten the station range.`,
      )
    }
  }
  return stations
}

function isScheduled(station: number, interval: number) {
  return Math.abs(station / interval - Math.round(station / interval)) < 1e-7
}

function centerlinePointAtOffset(
  centerline: CenterlineCandidate,
  distances: Float64Array,
  offsetFeet: number,
  direction: CenterlineDirection,
) {
  const boundedOffset = Math.max(
    0,
    Math.min(centerline.lengthFeet, offsetFeet),
  )
  let upper = 1
  while (
    upper < distances.length - 1 &&
    distances[upper] < boundedOffset
  ) {
    upper += 1
  }
  const lower = Math.max(0, upper - 1)
  const segmentLength = distances[upper] - distances[lower]
  const fraction =
    segmentLength > 0
      ? (boundedOffset - distances[lower]) / segmentLength
      : 0
  const start = centerline.mapPoints[lower]
  const end = centerline.mapPoints[upper]
  const directionSign = direction === 'a-to-b' ? 1 : -1
  return {
    mapPoint: {
      x: start.x + (end.x - start.x) * fraction,
      y: start.y + (end.y - start.y) * fraction,
    },
    mapTangent: {
      x: (end.x - start.x) * directionSign,
      y: (end.y - start.y) * directionSign,
    },
  }
}

export function generateCenterlineStationTicks(
  centerline: CenterlineCandidate,
  direction: CenterlineDirection,
  startStation: number,
  options: CenterlineStationTickOptions,
): CenterlineStationTick[] {
  if (!Number.isFinite(startStation)) {
    throw new Error('Starting station must be a finite number.')
  }
  validInterval(options.minorInterval, 'Minor tick interval')
  validInterval(options.majorInterval, 'Major tick interval')
  validInterval(options.labelInterval, 'Label interval')

  const fullMinimum = startStation
  const fullMaximum = startStation + centerline.lengthFeet
  const requestedStart = options.rangeStart ?? fullMinimum
  const requestedEnd = options.rangeEnd ?? fullMaximum
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd)) {
    throw new Error('Station range values must be finite numbers.')
  }
  const minimum = Math.max(
    fullMinimum,
    Math.min(requestedStart, requestedEnd),
  )
  const maximum = Math.min(
    fullMaximum,
    Math.max(requestedStart, requestedEnd),
  )
  if (maximum < minimum) return []

  const stationValues = new Set<number>()
  for (const interval of [
    options.minorInterval,
    options.majorInterval,
    options.labelInterval,
  ]) {
    for (const station of stationSchedule(minimum, maximum, interval)) {
      stationValues.add(station)
      if (stationValues.size > MAX_STATION_TICKS) {
        throw new Error(
          `Station intervals create more than ${MAX_STATION_TICKS.toLocaleString()} marks. Increase the intervals or shorten the station range.`,
        )
      }
    }
  }

  const distances = centerlineDistances(centerline)
  return [...stationValues]
    .sort((first, second) => first - second)
    .map((stationFeet) => {
      const directedOffset = stationFeet - startStation
      const centerlineOffsetFeet =
        direction === 'a-to-b'
          ? directedOffset
          : centerline.lengthFeet - directedOffset
      const location = centerlinePointAtOffset(
        centerline,
        distances,
        centerlineOffsetFeet,
        direction,
      )
      return {
        id: `station:${stationFeet.toFixed(6)}`,
        stationFeet,
        centerlineOffsetFeet,
        ...location,
        minor: isScheduled(stationFeet, options.minorInterval),
        major: isScheduled(stationFeet, options.majorInterval),
        label: isScheduled(stationFeet, options.labelInterval),
      }
    })
}

export function formatStation(stationFeet: number, decimalPlaces = 0) {
  if (!Number.isFinite(stationFeet)) return '—'
  const places = Math.max(0, Math.min(3, Math.trunc(decimalPlaces)))
  const factor = 10 ** places
  const rounded = Math.round(Math.abs(stationFeet) * factor) / factor
  let major = Math.floor(rounded / 100)
  let remainder = rounded - major * 100
  if (Math.round(remainder * factor) >= 100 * factor) {
    major += 1
    remainder = 0
  }
  const remainderText =
    places === 0
      ? Math.round(remainder).toString().padStart(2, '0')
      : remainder.toFixed(places).padStart(3 + places, '0')
  return `${stationFeet < 0 ? '-' : ''}${major}+${remainderText}`
}
