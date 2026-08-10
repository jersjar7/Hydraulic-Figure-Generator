import type { MapAnnotation } from '../../core/types'

export type AnnotationCapabilities = {
  content: boolean
  resultField: boolean
  fill: boolean
  typography: boolean
  leaderLine: boolean
  positionLock: boolean
}

export function annotationCapabilities(
  annotation: MapAnnotation,
): AnnotationCapabilities {
  const content =
    annotation.kind !== 'line' && annotation.kind !== 'arrow'
  return {
    content,
    resultField:
      annotation.kind === 'result' && !annotation.hydraulicExtremum,
    fill: content,
    typography: content,
    leaderLine:
      annotation.kind === 'leader' || annotation.kind === 'result',
    positionLock:
      annotation.kind === 'text' ||
      annotation.kind === 'leader' ||
      annotation.kind === 'result',
  }
}
