import type { SetStateAction } from 'react'
import type { HydraulicEngine } from '../../../core/hydraulicEngine'
import {
  canvasPointToMap,
  formatHydraulicResultLabel,
  FRAMES,
  sampleHydraulicResult,
} from '../../../core/mapRenderer'
import type {
  AnnotationDefaults,
  AnnotationTool,
  Bounds,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapCoordinate,
  ResultLabelField,
  WseDifferenceScene,
} from '../../../core/types'
import { createManualAnnotationMapTool } from '../../annotations/manualAnnotationMapTool'
import { WSE_ANNOTATION_TOOLS } from '../annotationTools'
import { updateDraggedResultAnnotation } from '../workspaceInteractions'

type Options = {
  tool: AnnotationTool
  annotations: MapAnnotation[]
  annotationStart: MapCoordinate | null
  defaults: AnnotationDefaults
  scene: WseDifferenceScene
  engine: HydraulicEngine
  bounds: Bounds
  settings: FigureSettings
  setAnnotations(value: SetStateAction<MapAnnotation[]>): void
  commitAnnotationChange(
    before: MapAnnotation[],
    after: MapAnnotation[],
    label: string,
  ): void
  setSelectedId(id: string | null): void
  setAnnotationStart(point: MapCoordinate | null): void
  showPlacedAnnotation(annotation: MapAnnotation): void
  setDragging(dragging: boolean): void
  createAnnotation(
    kind: MapAnnotation['kind'],
    points: MapCoordinate[],
    text?: string,
    resultField?: ResultLabelField,
  ): MapAnnotation
  appendNotices(notices: IngestNotice[]): void
}

export function createAnnotationMapTool(options: Options) {
  const { scene, engine, bounds, settings, defaults } = options
  return createManualAnnotationMapTool({
    ...options,
    tools: WSE_ANNOTATION_TOOLS,
    finalizeDraggedAnnotation: (annotation, part) =>
      updateDraggedResultAnnotation(
        annotation,
        part,
        scene,
        engine,
        settings,
      ),
    handlePointTool: (tool, input) => {
      if (tool.annotationKind !== 'result') return false
      const sample = sampleHydraulicResult(
        scene,
        bounds,
        settings,
        input.mapPoint,
      )
      if (!sample) {
        options.appendNotices([{
          level: 'warning',
          text: 'No hydraulic result was found close enough to that point.',
        }])
        return true
      }
      const frame = FRAMES[settings.orientation]
      const labelPoint = canvasPointToMap(
        Math.min(frame.width - 40, input.screenPoint.x + 135),
        Math.max(40, input.screenPoint.y - 80),
        bounds,
        settings,
      )
      options.createAnnotation(
        'result',
        [input.mapPoint, labelPoint],
        formatHydraulicResultLabel(defaults.resultField, sample),
        defaults.resultField,
      )
      return true
    },
  })
}
