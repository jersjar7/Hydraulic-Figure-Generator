import type { RefObject } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  FigureSettings,
  MapElementBounds,
  WseDifferenceScene,
} from '../../core/types'
import type { useWseAnnotationController } from './useWseAnnotationController'
import type { useWseAssessmentComposition } from './useWseAssessmentComposition'
import type { useWseEditorUi } from './useWseEditorUi'
import type { useWseFigureDocument } from './useWseFigureDocument'
import type { useWseFigureElementController } from './useWseFigureElementController'
import { useWseMapInteractions } from './useWseMapInteractions'

type Options = {
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  elementBoundsRef: RefObject<MapElementBounds[]>
  editorUi: ReturnType<typeof useWseEditorUi>
  figureDocument: ReturnType<typeof useWseFigureDocument>
  annotationController: ReturnType<typeof useWseAnnotationController>
  figureElements: ReturnType<typeof useWseFigureElementController>
  assessment: ReturnType<typeof useWseAssessmentComposition>
}

export function useWseWorkspaceMapInteractions(options: Options) {
  const {
    activeSettingsSection,
    annotationTool,
    annotationStart,
  } = options.editorUi
  const assessmentWorkflow = options.assessment.workflow

  return useWseMapInteractions({
    scene: options.scene,
    engine: options.engine,
    settings: options.settings,
    elementBoundsRef: options.elementBoundsRef,
    activeSettingsSection,
    annotationTool,
    annotations: options.figureDocument.annotations,
    annotationStart,
    annotationDefaults: options.figureDocument.annotationDefaults,
    centerlineStationLayers: options.assessment.centerlineStationLayers,
    assessmentDisplayLayer: options.assessment.displayLayer,
    stationedAssessmentLines: options.assessment.stationedAssessmentLines,
    assessmentReviewOpen: options.assessment.state.panelView === 'review',
    assessmentOverrides: options.assessment.state.overrides,
    setAnnotations: options.figureDocument.setAnnotations,
    commitAnnotationChange:
      options.annotationController.commitAnnotationChange,
    setAnnotationStart: options.editorUi.setAnnotationStart,
    setSelectedAnnotationId: options.editorUi.setSelectedAnnotationId,
    showPlacedAnnotation: options.annotationController.selectPlacedAnnotation,
    createAnnotation: options.annotationController.createAnnotation,
    appendNotices: options.editorUi.appendNotices,
    setAnnotationDragging: options.editorUi.setAnnotationDragging,
    selectFigureElement: options.editorUi.setActiveElement,
    previewElementPosition: options.figureElements.previewElementPosition,
    commitElementPosition: options.figureElements.commitElementPosition,
    setElementDragging: options.editorUi.setElementDragging,
    setHoveredElement: options.editorUi.setHoveredElement,
    selectStationLabel: (id, centerlineId) => {
      options.assessment.stationingSource.setActiveCenterline(centerlineId)
      options.editorUi.setActiveSettingsSection('stationing')
      options.editorUi.setSelectedStationLabelId(id)
      options.editorUi.setRightOpen(true)
    },
    updateStationLabelOverride:
      options.figureElements.updateStationLabelOverride,
    setStationLabelDragging: options.editorUi.setStationLabelDragging,
    selectAssessmentLine: assessmentWorkflow.selectLine,
    selectAssessmentStatus: assessmentWorkflow.setReviewTab,
    updateAssessmentOverride: assessmentWorkflow.setOverride,
    setAssessmentCalloutDragging:
      options.editorUi.setAssessmentCalloutDragging,
    openAssessmentReview: () => {
      assessmentWorkflow.openReview()
      options.editorUi.setLeftCollapsed(false)
      options.editorUi.setLeftOpen(true)
    },
  })
}
