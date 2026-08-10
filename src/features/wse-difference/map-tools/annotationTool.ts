import type { SetStateAction } from 'react'
import type { HydraulicEngine } from '../../../core/hydraulicEngine'
import {
  canvasPointToMap,
  formatHydraulicResultLabel,
  FRAMES,
  hitTestAnnotation,
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
import { mapAnnotationFigureObjectAdapter } from '../../annotations/mapAnnotationFigureObject'
import { updateAdaptedFigureObject } from '../../figure-objects/figureObjectAdapter'
import {
  beginFigureObjectDrag,
  updateFigureObjectDrag,
} from '../../figure-objects/figureObjectGeometry'
import { createMapFigureObjectContext } from '../../figure-objects/mapFigureObjectContext'
import type { MapInteractionTool } from '../../map-interactions/mapInteraction'
import { wseAnnotationToolById } from '../annotationTools'
import {
  draggedAnnotationPoints,
  updateDraggedResultAnnotation,
  type AnnotationDrag,
} from '../workspaceInteractions'

type AnnotationMapToolOptions = {
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

export function createAnnotationMapTool({
  tool,
  annotations,
  annotationStart,
  defaults,
  scene,
  engine,
  bounds,
  settings,
  setAnnotations,
  commitAnnotationChange,
  setSelectedId,
  setAnnotationStart,
  showPlacedAnnotation,
  setDragging,
  createAnnotation,
  appendNotices,
}: AnnotationMapToolOptions): MapInteractionTool {
  const toolModule = wseAnnotationToolById(tool)

  return {
    id: 'annotation',
    begin: ({ screenPoint, mapPoint }) => {
      if (toolModule.activation === 'instant') return { handled: true }

      if (toolModule.activation === 'select') {
        const hit = hitTestAnnotation(
          annotations,
          bounds,
          settings,
          screenPoint.x,
          screenPoint.y,
        )
        setSelectedId(hit?.id ?? null)
        if (!hit) return { handled: true }

        const annotation = annotations.find((item) => item.id === hit.id)
        if (!annotation) return { handled: true }
        showPlacedAnnotation(annotation)
        if (annotation.hydraulicExtremum && hit.part !== 'body') {
          return { handled: true }
        }

        if (annotation.kind === 'text') {
          const context = createMapFigureObjectContext(bounds, settings)
          const originalAnnotations = annotations
          const objectIndex = annotations.findIndex(
            (item) => item.id === annotation.id,
          )
          const drag = beginFigureObjectDrag(
            mapAnnotationFigureObjectAdapter.toFigureObject(
              annotation,
              objectIndex,
            ),
            { type: 'body' },
            screenPoint,
          )
          let preview = originalAnnotations
          let moved = false
          const update = (point: { x: number; y: number }) => {
            moved =
              moved ||
              Math.hypot(
                point.x - drag.start.x,
                point.y - drag.start.y,
              ) > 0.5
            const nextObject = updateFigureObjectDrag(
              drag,
              point,
              context.adapter,
              context.frameBounds,
              20,
            )
            preview = updateAdaptedFigureObject(
              originalAnnotations,
              annotation.id,
              mapAnnotationFigureObjectAdapter,
              () => nextObject,
            )
            setAnnotations(preview)
          }

          setDragging(true)
          return {
            handled: true,
            capturePointer: true,
            session: {
              id: `figure-object:${annotation.id}`,
              move: ({ screenPoint: point }) => update(point),
              finish: ({ screenPoint: point }) => {
                update(point)
                if (moved) {
                  commitAnnotationChange(
                    originalAnnotations,
                    preview,
                    'move text annotation',
                  )
                } else {
                  setAnnotations(originalAnnotations)
                }
                setDragging(false)
              },
              cancel: () => {
                setAnnotations(originalAnnotations)
                setDragging(false)
              },
            },
          }
        }

        const drag: AnnotationDrag = {
          id: hit.id,
          part: hit.part,
          start: mapPoint,
          end: mapPoint,
          originalPoints: annotation.points.map((point) => ({ ...point })),
        }
        const update = () =>
          setAnnotations((current) =>
            current.map((item) =>
              item.id === drag.id
                ? {
                    ...item,
                    points: draggedAnnotationPoints(item, drag),
                  }
                : item,
            ),
          )

        setDragging(true)
        return {
          handled: true,
          capturePointer: true,
          session: {
            id: `annotation:${hit.id}`,
            move: ({ mapPoint: point }) => {
              drag.end = point
              update()
            },
            finish: ({ mapPoint: point }) => {
              drag.end = point
              setAnnotations((current) =>
                current.map((item) =>
                  item.id === drag.id
                    ? updateDraggedResultAnnotation(
                        {
                          ...item,
                          points: draggedAnnotationPoints(item, drag),
                        },
                        drag.part,
                        scene,
                        engine,
                        settings,
                      )
                    : item,
                ),
              )
              setDragging(false)
            },
            cancel: () => {
              setAnnotations((current) =>
                current.map((item) =>
                  item.id === drag.id
                    ? {
                        ...item,
                        points: drag.originalPoints.map((point) => ({
                          ...point,
                        })),
                      }
                    : item,
                ),
              )
              setDragging(false)
            },
          },
        }
      }

      if (
        toolModule.activation === 'point' &&
        toolModule.annotationKind === 'text'
      ) {
        createAnnotation(toolModule.annotationKind, [mapPoint])
        return { handled: true }
      }

      if (
        toolModule.activation === 'point' &&
        toolModule.annotationKind === 'result'
      ) {
        const sample = sampleHydraulicResult(
          scene,
          bounds,
          settings,
          mapPoint,
        )
        if (!sample) {
          appendNotices([
            {
              level: 'warning',
              text: 'No hydraulic result was found close enough to that point.',
            },
          ])
          return { handled: true }
        }
        const frame = FRAMES[settings.orientation]
        const labelScreenPoint = {
          x: Math.min(frame.width - 40, screenPoint.x + 135),
          y: Math.max(40, screenPoint.y - 80),
        }
        const labelMapPoint = canvasPointToMap(
          labelScreenPoint.x,
          labelScreenPoint.y,
          bounds,
          settings,
        )
        createAnnotation(
          'result',
          [mapPoint, labelMapPoint],
          formatHydraulicResultLabel(defaults.resultField, sample),
          defaults.resultField,
        )
        return { handled: true }
      }

      if (
        toolModule.activation !== 'segment' ||
        !toolModule.annotationKind
      ) {
        return null
      }

      if (!annotationStart) {
        setAnnotationStart(mapPoint)
        return { handled: true }
      }

      createAnnotation(
        toolModule.annotationKind,
        [annotationStart, mapPoint],
      )
      setAnnotationStart(null)
      return { handled: true }
    },
  }
}
