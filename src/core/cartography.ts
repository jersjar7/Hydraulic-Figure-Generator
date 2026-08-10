import type {
  CartographySettings,
  StrokePattern,
} from './types'

export const MAX_CLASS_BANDS = 80
export const MAX_CONTOUR_LEVELS = 160

const STROKE_PATTERNS: readonly StrokePattern[] = [
  'solid',
  'dashed',
  'dotted',
]

function positive(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function resolveClassificationScale({
  minimum,
  maximum,
  requestedInterval,
  fallbackInterval,
  fallbackBandCount = 8,
}: {
  minimum: number
  maximum: number
  requestedInterval: number | null
  fallbackInterval?: number | null
  fallbackBandCount?: number
}) {
  const span = maximum - minimum
  if (!Number.isFinite(span) || span <= 0) {
    throw new Error('Classification maximum must be greater than its minimum.')
  }
  const preferredInterval = positive(requestedInterval)
    ? requestedInterval!
    : positive(fallbackInterval)
      ? fallbackInterval!
      : null
  const requestedBands = preferredInterval
    ? Math.ceil(span / preferredInterval)
    : Math.max(1, Math.round(fallbackBandCount))
  const bandCount = Math.max(
    1,
    Math.min(MAX_CLASS_BANDS, requestedBands),
  )
  return {
    minimum,
    maximum,
    interval: span / bandCount,
    bandCount,
  }
}

export function classificationBreaks(
  minimum: number,
  maximum: number,
  bandCount: number,
) {
  return Array.from(
    { length: Math.max(0, bandCount - 1) },
    (_, index) => minimum + ((index + 1) * (maximum - minimum)) / bandCount,
  )
}

export function resolveContourLevels(
  minimum: number,
  maximum: number,
  requestedInterval: number | null,
  fallbackInterval: number,
) {
  let interval = positive(requestedInterval)
    ? requestedInterval!
    : fallbackInterval
  if (!positive(interval)) return []
  if ((maximum - minimum) / interval > MAX_CONTOUR_LEVELS) {
    interval = (maximum - minimum) / MAX_CONTOUR_LEVELS
  }
  const first = Math.ceil(minimum / interval) * interval
  const levels: number[] = []
  for (
    let level = first;
    level <= maximum + interval * 1e-8;
    level += interval
  ) {
    levels.push(level)
  }
  return levels
}

export function strokeDashSegments(pattern: StrokePattern, width: number) {
  const safeWidth = Math.max(0.25, width)
  if (pattern === 'dashed') return [safeWidth * 5, safeWidth * 3]
  if (pattern === 'dotted') return [safeWidth, safeWidth * 2]
  return []
}

export function cartographyValidationIssues(settings: CartographySettings) {
  const issues: string[] = []
  const bounds = settings.classification.bounds
  if (bounds.mode === 'symmetric' && bounds.bound !== null && !positive(bounds.bound)) {
    issues.push('The classification bound must be greater than zero.')
  }
  if (
    bounds.mode === 'range' &&
    bounds.minimum !== null &&
    bounds.maximum !== null &&
    bounds.maximum <= bounds.minimum
  ) {
    issues.push('The classification maximum must be greater than the minimum.')
  }
  if (
    settings.classification.interval !== null &&
    !positive(settings.classification.interval)
  ) {
    issues.push('The classification interval must be greater than zero.')
  }
  if (settings.contours) {
    if (!STROKE_PATTERNS.includes(settings.contours.pattern)) {
      issues.push('The contour pattern is not supported.')
    }
    if (settings.contours.interval !== null && !positive(settings.contours.interval)) {
      issues.push('The contour interval must be greater than zero.')
    }
    if (!positive(settings.contours.width)) {
      issues.push('The contour width must be greater than zero.')
    }
  }
  if (settings.mesh) {
    if (!STROKE_PATTERNS.includes(settings.mesh.pattern)) {
      issues.push('The mesh pattern is not supported.')
    }
    if (!positive(settings.mesh.width)) {
      issues.push('The mesh width must be greater than zero.')
    }
    if (
      !Number.isFinite(settings.mesh.opacity) ||
      settings.mesh.opacity < 0 ||
      settings.mesh.opacity > 1
    ) {
      issues.push('The mesh opacity must be between zero and one.')
    }
  }
  return issues
}

export function assertValidCartographySettings(
  settings: CartographySettings,
  path = 'Cartography settings',
) {
  const issues = cartographyValidationIssues(settings)
  if (issues.length > 0) throw new Error(`${path}: ${issues[0]}`)
}
