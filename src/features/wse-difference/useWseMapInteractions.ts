import {
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import { canvasPointToMap } from '../../core/mapRenderer'
import type {
  AnnotationDefaults,
  AnnotationTool,
  AssessmentLineOverride,
  AssessmentMapLayer,
  CenterlineStationLayer,
  FigureElementPanelKey,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapCoordinate,
  MapElementBounds,
  MapElementKey,
  ResultLabelField,
  StationLabelOverride,
  StationedAssessmentLineCollection,
  WseDifferenceScene,
} from '../../core/types'
import {
  type MapInteractionTool,
  type MapPointerInput,
} from '../map-interactions/mapInteraction'
import { useCanvasInteractionRuntime } from '../map-interactions/useCanvasInteractionRuntime'
import type { SettingsSectionKey } from './workspaceConfiguration'
import { createAnnotationMapTool } from './map-tools/annotationTool'
import {
  createAssessmentCalloutTool,
  createAssessmentLineTool,
} from './map-tools/assessmentTools'
import { createFigureElementTool } from './map-tools/figureElementTool'
import { createStationLabelTool } from './map-tools/stationLabelTool'

type Options = {
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  elementBoundsRef: RefObject<MapElementBounds[]>
  activeSettingsSection: SettingsSectionKey
  annotationTool: AnnotationTool
  annotations: MapAnnotation[]
  annotationStart: MapCoordinate | null
  annotationDefaults: AnnotationDefaults
  centerlineStationLayer?: CenterlineStationLayer
  assessmentDisplayLayer: AssessmentMapLayer
  stationedAssessmentLines: StationedAssessmentLineCollection | null
  assessmentReviewOpen: boolean
  assessmentOverrides: Record<string, AssessmentLineOverride>
  setAnnotations(value: SetStateAction<MapAnnotation[]>): void
  setAnnotationStart(point: MapCoordinate | null): void
  setSelectedAnnotationId(id: string | null): void
  showPlacedAnnotation(annotation: MapAnnotation): void
  createAnnotation(
    kind: MapAnnotation['kind'],
    points: MapCoordinate[],
    text?: string,
    resultField?: ResultLabelField,
  ): MapAnnotation
  appendNotices(notices: IngestNotice[]): void
  setAnnotationDragging(dragging: boolean): void
  selectFigureElement(key: FigureElementPanelKey): void
  updateElementPosition(
    key: MapElementKey,
    position: FigureSettings['elementPositions'][MapElementKey],
  ): void
  setElementDragging(dragging: boolean): void
  setHoveredElement(key: MapElementKey | null): void
  selectStationLabel(id: string): void
  updateStationLabelOverride(
    id: string,
    override: Partial<StationLabelOverride> | null,
  ): void
  setStationLabelDragging(dragging: boolean): void
  selectAssessmentLine(id: string): void
  selectAssessmentStatus(
    status: 'included' | 'review' | 'excluded',
  ): void
  updateAssessmentOverride(
    id: string,
    patch: Partial<AssessmentLineOverride>,
  ): void
  setAssessmentCalloutDragging(dragging: boolean): void
  openAssessmentReview(): void
}

function canvasScreenPoint(
  event: ReactPointerEvent<HTMLCanvasElement>,
) {
  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height
  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y)),
  }
}

export function useWseMapInteractions(options: Options) {
  const pointerInput = useCallback(
    (
      event: ReactPointerEvent<HTMLCanvasElement>,
    ): MapPointerInput => {
      const screenPoint = canvasScreenPoint(event)
      return {
        screenPoint,
        mapPoint: canvasPointToMap(
          screenPoint.x,
          screenPoint.y,
          options.engine.commonBounds(),
          options.settings,
        ),
      }
    },
    [options.engine, options.settings],
  )

  const tools = (): MapInteractionTool[] => {
    const bounds = options.engine.commonBounds()
    return [
      createFigureElementTool({
        enabled: options.activeSettingsSection === 'elements',
        settings: options.settings,
        elementBounds: () => options.elementBoundsRef.current ?? [],
        selectElement: options.selectFigureElement,
        updatePosition: options.updateElementPosition,
        setDragging: options.setElementDragging,
        setHovered: options.setHoveredElement,
      }),
      createStationLabelTool({
        enabled: options.annotationTool === 'select',
        layer: options.centerlineStationLayer,
        bounds,
        settings: options.settings,
        selectLabel: options.selectStationLabel,
        updateOverride: options.updateStationLabelOverride,
        setDragging: options.setStationLabelDragging,
      }),
      createAssessmentCalloutTool({
        enabled:
          options.annotationTool === 'select' ||
          options.assessmentReviewOpen,
        layer: options.assessmentDisplayLayer,
        stationed: options.stationedAssessmentLines,
        bounds,
        settings: options.settings,
        overrides: options.assessmentOverrides,
        selectLine: options.selectAssessmentLine,
        selectStatus: options.selectAssessmentStatus,
        setOverride: options.updateAssessmentOverride,
        setDragging: options.setAssessmentCalloutDragging,
        openReview: options.openAssessmentReview,
      }),
      createAssessmentLineTool({
        enabled: options.assessmentReviewOpen,
        stationed: options.stationedAssessmentLines,
        bounds,
        settings: options.settings,
        selectLine: options.selectAssessmentLine,
        selectStatus: options.selectAssessmentStatus,
      }),
      ...(options.scene
        ? [
            createAnnotationMapTool({
              tool: options.annotationTool,
              annotations: options.annotations,
              annotationStart: options.annotationStart,
              defaults: options.annotationDefaults,
              scene: options.scene,
              engine: options.engine,
              bounds,
              settings: options.settings,
              setAnnotations: options.setAnnotations,
              setSelectedId: options.setSelectedAnnotationId,
              setAnnotationStart: options.setAnnotationStart,
              showPlacedAnnotation: options.showPlacedAnnotation,
              setDragging: options.setAnnotationDragging,
              createAnnotation: options.createAnnotation,
              appendNotices: options.appendNotices,
            }),
          ]
        : []),
    ]
  }

  return useCanvasInteractionRuntime({
    enabled: Boolean(options.scene),
    tools,
    pointerInput,
    onReset: () => {
      options.setAnnotationDragging(false)
      options.setAssessmentCalloutDragging(false)
      options.setStationLabelDragging(false)
      options.setElementDragging(false)
      options.setHoveredElement(null)
    },
  })
}
