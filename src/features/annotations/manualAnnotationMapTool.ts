import type { SetStateAction } from 'react'
import { hitTestAnnotation } from '../../core/mapRenderer'
import type {
  AnnotationDefaults,
  AnnotationTool,
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
  ResultLabelField,
} from '../../core/types'
import { updateAdaptedFigureObject } from '../figure-objects/figureObjectAdapter'
import {
  beginFigureObjectDrag,
  updateFigureObjectDrag,
} from '../figure-objects/figureObjectGeometry'
import { createMapFigureObjectContext } from '../figure-objects/mapFigureObjectContext'
import type {
  MapInteractionTool,
  MapPointerInput,
} from '../map-interactions/mapInteraction'
import {
  draggedAnnotationPoints,
  type AnnotationDrag,
} from './annotationEditorOperations'
import { mapAnnotationFigureObjectAdapter } from './mapAnnotationFigureObject'
import {
  isAnchoredMapCallout,
  mapAnnotationDragTarget,
} from './mapAnnotationManipulation'
import {
  annotationToolById,
  MANUAL_ANNOTATION_TOOLS,
  type AnnotationToolModule,
} from './annotationTools'

type Options = {
  tool: AnnotationTool
  tools?: readonly AnnotationToolModule[]
  annotations: MapAnnotation[]
  annotationStart: MapCoordinate | null
  defaults: AnnotationDefaults
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
  handlePointTool?(
    tool: AnnotationToolModule,
    input: MapPointerInput,
  ): boolean
  finalizeDraggedAnnotation?(
    annotation: MapAnnotation,
    part: 'body' | 'segment' | 'start' | 'end',
  ): MapAnnotation
}

function pointsChanged(before: MapAnnotation, after: MapAnnotation) {
  return after.points.some(
    (point, index) =>
      point.x !== before.points[index]?.x ||
      point.y !== before.points[index]?.y,
  )
}

export function createManualAnnotationMapTool(options: Options): MapInteractionTool {
  const {
    tool,
    tools = MANUAL_ANNOTATION_TOOLS,
    annotations,
    annotationStart,
    bounds,
    settings,
    setAnnotations,
    commitAnnotationChange,
    setSelectedId,
    setAnnotationStart,
    showPlacedAnnotation,
    setDragging,
    createAnnotation,
  } = options
  const toolModule = annotationToolById(tools, tool)

  return {
    id: 'annotation',
    begin: (input) => {
      const { screenPoint, mapPoint } = input
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
        if (!hit) return null
        const annotation = annotations.find((item) => item.id === hit.id)
        if (!annotation) return { handled: true }
        showPlacedAnnotation(annotation)
        if (annotation.hydraulicExtremum && hit.part !== 'body') {
          return { handled: true }
        }

        if (annotation.kind === 'text' || isAnchoredMapCallout(annotation)) {
          if (annotation.locked) return { handled: true }
          const context = createMapFigureObjectContext(bounds, settings)
          const originalAnnotations = annotations
          const objectIndex = annotations.findIndex((item) => item.id === annotation.id)
          const drag = beginFigureObjectDrag(
            mapAnnotationFigureObjectAdapter.toFigureObject(annotation, objectIndex),
            mapAnnotationDragTarget(annotation, hit.part),
            screenPoint,
          )
          let preview = originalAnnotations
          const update = (point: { x: number; y: number }) => {
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
                const changed = preview.find((item) => item.id === annotation.id)
                if (changed && pointsChanged(annotation, changed)) {
                  const finalized = preview.map((item) =>
                    item.id === annotation.id
                      ? (options.finalizeDraggedAnnotation?.(item, hit.part) ?? item)
                      : item,
                  )
                  setAnnotations(finalized)
                  commitAnnotationChange(
                    originalAnnotations,
                    finalized,
                    `move ${annotation.kind} annotation`,
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
        const originalAnnotations = annotations
        let preview = originalAnnotations
        const update = () => {
          preview = originalAnnotations.map((item) =>
            item.id === drag.id
              ? { ...item, points: draggedAnnotationPoints(item, drag) }
              : item,
          )
          setAnnotations(preview)
        }
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
              update()
              const finalized = preview.map((item) =>
                item.id === drag.id
                  ? (options.finalizeDraggedAnnotation?.(item, drag.part) ?? item)
                  : item,
              )
              setAnnotations(finalized)
              if (pointsChanged(annotation, finalized.find((item) => item.id === drag.id)!)) {
                commitAnnotationChange(
                  originalAnnotations,
                  finalized,
                  `move ${annotation.kind} annotation`,
                )
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

      if (toolModule.activation === 'point') {
        if (toolModule.annotationKind === 'text') {
          createAnnotation('text', [mapPoint])
          return { handled: true }
        }
        if (options.handlePointTool?.(toolModule, input)) {
          return { handled: true }
        }
      }

      if (toolModule.activation !== 'segment' || !toolModule.annotationKind) {
        return null
      }
      if (!annotationStart) {
        setAnnotationStart(mapPoint)
        return { handled: true }
      }
      createAnnotation(toolModule.annotationKind, [annotationStart, mapPoint])
      setAnnotationStart(null)
      return { handled: true }
    },
  }
}
