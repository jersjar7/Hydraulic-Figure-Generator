import type {
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../types'
import {
  resolveClassificationScale,
  resolveContourLevels,
} from '../cartography'

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
  return resolveClassificationScale({
    minimum,
    maximum,
    requestedInterval: settings.scalarLegendInterval,
    fallbackInterval: scene.autoInterval,
  })
}

export function scalarContourLevels(
  minimum: number,
  maximum: number,
  requestedInterval: number | null,
  fallbackInterval: number,
) {
  return resolveContourLevels(
    minimum,
    maximum,
    requestedInterval,
    fallbackInterval,
  )
}
