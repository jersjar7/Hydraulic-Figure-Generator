import {
  COLOR_RAMP_CATALOG,
  SCALAR_COLOR_RAMP_OPTIONS,
  colorRampColor,
  colorRampGradient,
} from '../colorRamps'
import type { ScalarRampKey } from '../types'

export const SCALAR_RAMPS = Object.fromEntries(
  SCALAR_COLOR_RAMP_OPTIONS.map(({ key, stops }) => [key, stops]),
) as Record<ScalarRampKey, (typeof COLOR_RAMP_CATALOG)[ScalarRampKey]['stops']>

export const SCALAR_RAMP_OPTIONS = SCALAR_COLOR_RAMP_OPTIONS

export function scalarRampColor(key: ScalarRampKey, fraction: number) {
  return colorRampColor(key, fraction)
}

export function scalarColor(
  key: ScalarRampKey,
  value: number,
  minimum: number,
  maximum: number,
) {
  return scalarRampColor(key, (value - minimum) / (maximum - minimum || 1))
}

export function scalarRampGradient(key: ScalarRampKey) {
  return colorRampGradient(key)
}
