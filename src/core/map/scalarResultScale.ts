import type {
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../types'

export type ScalarResultScale = {
  minimum: number
  maximum: number
  interval: number
  bandCount: number
}

export function resolveScalarResultScale(
  scene: PlanViewResultScene,
  settings: PlanViewResultSettings,
): ScalarResultScale {
  const minimum = Number.isFinite(settings.legendMin)
    ? settings.legendMin!
    : scene.autoMin
  const requestedMaximum = Number.isFinite(settings.legendMax)
    ? settings.legendMax!
    : scene.autoMax
  const maximum = requestedMaximum > minimum
    ? requestedMaximum
    : minimum + scene.autoInterval
  let interval =
    settings.scalarLegendInterval && settings.scalarLegendInterval > 0
      ? settings.scalarLegendInterval
      : scene.autoInterval
  if ((maximum - minimum) / interval > 80) {
    interval = (maximum - minimum) / 80
  }
  const bandCount = Math.max(
    1,
    Math.min(80, Math.ceil((maximum - minimum) / interval)),
  )
  return { minimum, maximum, interval, bandCount }
}

export function scalarContourLevels(
  minimum: number,
  maximum: number,
  requestedInterval: number | null,
  fallbackInterval: number,
) {
  let interval =
    requestedInterval && requestedInterval > 0
      ? requestedInterval
      : fallbackInterval
  if ((maximum - minimum) / interval > 160) {
    interval = (maximum - minimum) / 160
  }
  if (!Number.isFinite(interval) || interval <= 0) return []
  const first = Math.ceil(minimum / interval) * interval
  const levels: number[] = []
  for (let level = first; level <= maximum + interval * 1e-8; level += interval) {
    levels.push(level)
  }
  return levels
}
