import {
  formatWseExtremumLabel,
  type WseDifferenceExtrema,
  type WseDifferenceExtremum,
} from '../../core/hydraulicEngine'
import type {
  AnnotationDefaults,
  Bounds,
  FigureSettings,
  MapAnnotation,
  WseExtremumKind,
} from '../../core/types'
import { defaultExtremumLabelPoint } from './workspaceInteractions'

function availableExtrema(extrema: WseDifferenceExtrema) {
  return [extrema.rise, extrema.reduction].filter(
    (item): item is WseDifferenceExtremum => item !== null,
  )
}

export function synchronizeWseExtremaAnnotations(
  annotations: MapAnnotation[],
  extrema: WseDifferenceExtrema,
) {
  const byKind = new Map(
    availableExtrema(extrema).map((extremum) => [
      extremum.kind,
      extremum,
    ]),
  )
  return annotations.flatMap((annotation) => {
    const kind = annotation.hydraulicExtremum
    if (!kind) return [annotation]
    const extremum = byKind.get(kind)
    if (!extremum) return []
    const previousTarget = annotation.points[0]
    const previousLabel = annotation.points[1]
    const labelPoint =
      previousTarget && previousLabel
        ? {
            x: extremum.point.x + previousLabel.x - previousTarget.x,
            y: extremum.point.y + previousLabel.y - previousTarget.y,
          }
        : extremum.point
    return [
      {
        ...annotation,
        points: [extremum.point, labelPoint],
        text: formatWseExtremumLabel(kind, extremum.value),
      },
    ]
  })
}

type UpsertWseExtremaOptions = {
  annotations: MapAnnotation[]
  extrema: WseDifferenceExtrema
  bounds: Bounds
  settings: FigureSettings
  defaults: AnnotationDefaults
  createId: () => string
}

export function upsertWseExtremaCallouts({
  annotations,
  extrema,
  bounds,
  settings,
  defaults,
  createId,
}: UpsertWseExtremaOptions) {
  const available = availableExtrema(extrema)
  const ids = new Map<WseExtremumKind, string>()
  for (const extremum of available) {
    ids.set(
      extremum.kind,
      annotations.find(
        (annotation) =>
          annotation.hydraulicExtremum === extremum.kind,
      )?.id ?? createId(),
    )
  }

  const extremaByKind = new Map(
    available.map((extremum) => [extremum.kind, extremum]),
  )
  const seen = new Set<WseExtremumKind>()
  const next = annotations.flatMap((annotation) => {
    const kind = annotation.hydraulicExtremum
    if (!kind) return [annotation]
    const extremum = extremaByKind.get(kind)
    if (!extremum || seen.has(kind)) return []
    seen.add(kind)
    const previousTarget = annotation.points[0]
    const previousLabel = annotation.points[1]
    const labelPoint =
      previousTarget && previousLabel
        ? {
            x: extremum.point.x + previousLabel.x - previousTarget.x,
            y: extremum.point.y + previousLabel.y - previousTarget.y,
          }
        : defaultExtremumLabelPoint(extremum, bounds, settings)
    return [
      {
        ...annotation,
        kind: 'leader' as const,
        points: [extremum.point, labelPoint],
        text: formatWseExtremumLabel(kind, extremum.value),
        resultField: undefined,
      },
    ]
  })

  for (const extremum of available) {
    if (seen.has(extremum.kind)) continue
    const labelPoint = defaultExtremumLabelPoint(
      extremum,
      bounds,
      settings,
    )
    next.push({
      id: ids.get(extremum.kind) ?? createId(),
      kind: 'leader',
      hydraulicExtremum: extremum.kind,
      points: [
        extremum.point,
        labelPoint,
      ],
      defaultPoints: [
        { ...extremum.point },
        { ...labelPoint },
      ],
      text: formatWseExtremumLabel(extremum.kind, extremum.value),
      color: extremum.kind === 'max-rise' ? '#b42318' : '#175cd3',
      fillColor: defaults.fillColor,
      lineWidth: defaults.lineWidth,
      fontSize: defaults.fontSize,
      rotation: defaults.rotation,
      dashed: defaults.dashed,
      background: true,
      locked: false,
      leaderVisible: true,
    })
  }

  return { annotations: next, available, ids }
}
