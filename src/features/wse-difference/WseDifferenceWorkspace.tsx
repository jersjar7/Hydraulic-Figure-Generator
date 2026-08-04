import {
  AlertCircle,
  Map,
} from 'lucide-react'
import {
  useCallback,
  useRef,
  useState,
} from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import { FigurePicker } from '../figures/FigurePicker'
import { useAssessmentMapLayers } from './useAssessmentMapLayers'
import { wseDifferenceFigure } from './wseDifferenceFigure'
import type {
  FigureSettings,
  IngestNotice,
  WseDifferenceScene,
} from '../../core/types'
import type { SettingsSectionKey } from './workspaceConfiguration'
import { useFittedCanvasSize } from './useFittedCanvasSize'
import { useWseEditorUi } from './useWseEditorUi'
import { useWseMapRendering } from './useWseMapRendering'
import { useWseMapInteractions } from './useWseMapInteractions'
import { useWseFigureDocument } from './useWseFigureDocument'
import { useWseAnnotationController } from './useWseAnnotationController'
import { useWseFigureElementController } from './useWseFigureElementController'
import { WSE_SETTINGS_SECTIONS } from './wseSettingsSections'
import { WseMapCanvas } from './components/WseMapCanvas'
import { WseSettingsContent } from './components/WseSettingsContent'
import { useWseGenerationController } from './useWseGenerationController'
import { createWseProjectPersistenceController } from './wseProjectPersistenceController'
import { createWseMapExportAction } from './wseMapExportAction'
import { createWseScenarioContext } from './wseScenarioContext'
import { createWseStationingSourceActions } from './wseStationingSourceActions'

const ACTIVE_FIGURE = wseDifferenceFigure

export function WseDifferenceWorkspace() {
  const { projectSession, projectDocument } = useHydraulicProjectWorkspace()
  const figureDocument = useWseFigureDocument()
  const editorUi = useWseEditorUi()
  const {
    settings,
    annotations,
    annotationDefaults,
    setSettings,
    setAnnotations,
    setAnnotationDefaults,
    resetDocument,
  } = figureDocument
  const {
    overlays,
    setOverlays,
    resetDocument: resetProjectDocument,
  } = projectDocument
  const {
    engine,
    baselineId: baselineScenarioId,
    comparisonId: comparisonScenarioId,
    assessmentId: assessmentScenarioId,
    baselineRun,
    comparisonRun,
    assessmentRun,
    assessmentCondition,
    baselineLabel,
    comparisonLabel,
    assessmentLabel,
    ready,
  } = createWseScenarioContext(projectSession, settings)
  const assessmentWorkflow = useAssessmentWorkflow(1)
  const assessmentState = assessmentWorkflow.state
  const {
    annotationTool,
    annotationPanelView,
    annotationPlacedView,
    annotationEditorView,
    selectedAnnotationId,
    annotationStart,
    annotationDragging,
    assessmentCalloutDragging,
    stationLabelDragging,
    notices,
    busy,
    leftOpen,
    leftCollapsed,
    rightOpen,
    activeSettingsSection,
    activeElement,
    selectedStationLabelId,
    hoveredElement,
    elementDragging,
    setAnnotationTool,
    setAnnotationPanelView,
    setAnnotationPlacedView,
    setAnnotationEditorView,
    setSelectedAnnotationId,
    setAnnotationStart,
    setAnnotationDragging,
    setAssessmentCalloutDragging,
    setStationLabelDragging,
    setNotices,
    setBusy,
    setLeftOpen,
    setLeftCollapsed,
    setRightOpen,
    setActiveSettingsSection,
    setActiveElement,
    setSelectedStationLabelId,
    setHoveredElement,
    setElementDragging,
  } = editorUi
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const canvasDisplaySize = useFittedCanvasSize(
    canvasFrameRef,
    settings.orientation,
  )
  const projectInputRef = useRef<HTMLInputElement>(null)
  const {
    centerlineCandidates,
    selectedCenterline,
    centerlineStationTicks,
    centerlineStationLayer,
    stationedAssessmentLines,
    exportLayer: assessmentExportLayer,
    displayLayer: assessmentDisplayLayer,
  } = useAssessmentMapLayers({
    modelWkt: assessmentCondition?.geometry?.wkt,
    overlays,
    state: assessmentState,
    stationing: settings.centerlineStationing,
    selectedStationLabelId,
    setCenterline: assessmentWorkflow.setCenterline,
    setSelectedLabelId: setSelectedStationLabelId,
  })
  const figureElements = useWseFigureElementController({
    engine,
    settings,
    stationingLayer: centerlineStationLayer,
    selectedStationLabelId,
    setSettings,
    setSelectedStationLabelId,
  })
  const stationingSourceActions = createWseStationingSourceActions({
    assessmentWorkflow,
    figureElements,
    setSelectedLabelId: setSelectedStationLabelId,
  })

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    setNotices((current) => [...current, ...incoming].slice(-40))
  }, [setNotices])

  const annotationController = useWseAnnotationController({
    scene,
    engine,
    settings,
    annotations,
    annotationDefaults,
    baselineLabel,
    comparisonLabel,
    panelView: annotationPanelView,
    placedView: annotationPlacedView,
    editorView: annotationEditorView,
    tool: annotationTool,
    drawing: Boolean(annotationStart),
    selectedId: selectedAnnotationId,
    setAnnotations,
    setAnnotationDefaults,
    setPanelView: setAnnotationPanelView,
    setPlacedView: setAnnotationPlacedView,
    setEditorView: setAnnotationEditorView,
    setTool: setAnnotationTool,
    setAnnotationStart,
    setSelectedId: setSelectedAnnotationId,
    appendNotices,
  })

  const updateSettings = <Key extends keyof FigureSettings>(
    key: Key,
    value: FigureSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const projectInputs = createHydraulicProjectInputActions({
    assessmentId: assessmentScenarioId,
    overlays,
    ingest: projectSession.ingest,
    removeCondition: projectSession.removeCondition,
    renameCondition: projectSession.renameCondition,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    setOverlays,
    onFilesChanged: () => {
      setScene(null)
      assessmentWorkflow.invalidate(settings.assessmentLineInterval)
    },
    onSelectionChanged: () => setScene(null),
    onAssessmentSourceChanged: () =>
      assessmentWorkflow.clear(settings.assessmentLineInterval),
    setBusy,
    appendNotices,
  })
  const generation = useWseGenerationController({
    engine,
    baselineId: baselineScenarioId,
    baselineRun,
    baselineLabel,
    comparisonId: comparisonScenarioId,
    comparisonRun,
    assessmentId: assessmentScenarioId,
    assessmentRun,
    assessmentLabel,
    settings,
    setScene,
    setAssessmentCollection: assessmentWorkflow.setCollection,
    setBusy,
    appendNotices,
    closePanels: () => {
      setLeftOpen(false)
      setRightOpen(false)
    },
  })

  const elementBoundsRef = useWseMapRendering({
    canvasRef,
    scene,
    engine,
    settings,
    overlays,
    assessment: assessmentDisplayLayer,
    annotations,
    selectedAnnotationId,
    selectedElementKey:
      activeSettingsSection === 'elements' && activeElement !== 'stationing'
        ? activeElement
        : null,
    interacting:
      annotationDragging ||
      assessmentCalloutDragging ||
      stationLabelDragging ||
      elementDragging,
    setBusy,
    appendNotices,
  })

  const mapInteractions = useWseMapInteractions({
    scene,
    engine,
    settings,
    elementBoundsRef,
    activeSettingsSection,
    annotationTool,
    annotations,
    annotationStart,
    annotationDefaults,
    centerlineStationLayer,
    assessmentDisplayLayer,
    stationedAssessmentLines,
    assessmentReviewOpen: assessmentState.panelView === 'review',
    assessmentOverrides: assessmentState.overrides,
    setAnnotations,
    setAnnotationStart,
    setSelectedAnnotationId,
    showPlacedAnnotation: annotationController.selectPlacedAnnotation,
    createAnnotation: annotationController.createAnnotation,
    appendNotices,
    setAnnotationDragging,
    selectFigureElement: (key) => setActiveElement(key),
    updateElementPosition: figureElements.updateElementPosition,
    setElementDragging,
    setHoveredElement,
    selectStationLabel: (id) => {
      setActiveSettingsSection('stationing')
      setSelectedStationLabelId(id)
      setRightOpen(true)
    },
    updateStationLabelOverride:
      figureElements.updateStationLabelOverride,
    setStationLabelDragging,
    selectAssessmentLine: assessmentWorkflow.selectLine,
    selectAssessmentStatus: assessmentWorkflow.setReviewTab,
    updateAssessmentOverride: assessmentWorkflow.setOverride,
    setAssessmentCalloutDragging,
    openAssessmentReview: () => {
      assessmentWorkflow.openReview()
      setLeftCollapsed(false)
      setLeftOpen(true)
    },
  })

  const resetProject = () => {
    mapInteractions.resetInteractions()
    projectSession.reset()
    resetProjectDocument()
    resetDocument()
    setSelectedAnnotationId(null)
    setAnnotationStart(null)
    setAnnotationTool('select')
    setAnnotationPanelView('create')
    setAnnotationPlacedView('list')
    setAnnotationEditorView('content')
    setLeftCollapsed(false)
    setSelectedStationLabelId(null)
    elementBoundsRef.current = []
    setActiveElement('title')
    setScene(null)
    assessmentWorkflow.reset(1)
    setNotices([])
  }

  const downloadMap = createWseMapExportAction({
    scene,
    engine,
    settings,
    overlays,
    assessment: assessmentExportLayer,
    annotations,
    setBusy,
    appendNotices,
  })

  const persistence = createWseProjectPersistenceController({
    projectSession,
    projectDocument,
    figureDocument,
    assessmentWorkflow,
    editorUi,
    setScene,
    appendNotices,
  })

  return (
    <FigureWorkspaceScaffold<SettingsSectionKey>
      figureLabel={ACTIVE_FIGURE.label}
      comparisonDescription={`${comparisonLabel} minus ${baselineLabel}`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={busy}
      notices={notices}
      settingsSections={WSE_SETTINGS_SECTIONS}
      activeSettingsSection={activeSettingsSection}
      onSave={persistence.saveProject}
      onLoad={() => projectInputRef.current?.click()}
      onOpenLeftPanel={() => {
        setLeftCollapsed(false)
        setLeftOpen(true)
      }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => {
        setLeftOpen(false)
        setRightOpen(false)
      }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={setActiveSettingsSection}
      onZoomOut={() =>
        updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))
      }
      onZoomIn={() =>
        updateSettings('zoom', Math.min(4, settings.zoom + 0.1))
      }
      onFitFrame={figureElements.resetView}
      loadInput={
        <input
          ref={projectInputRef}
          className="visually-hidden"
          type="file"
          accept=".hydfig,.json"
          onChange={persistence.loadProject}
        />
      }
      projectPanel={
        <HydraulicProjectPanel
          inputCapabilities={wseDifferenceFigure.editor.inputs}
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          projectSession={projectSession}
          assessmentWorkflow={assessmentWorkflow}
          assessmentInterval={settings.assessmentLineInterval}
          centerlineCandidates={centerlineCandidates}
          stationedAssessmentLines={stationedAssessmentLines}
          overlays={overlays}
          showOverlays={settings.showOverlays}
          projectInputs={projectInputs}
          toggleReviewSelection
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onAssessmentIntervalChange={(interval) => {
            updateSettings('assessmentLineInterval', interval)
            assessmentWorkflow.clear(interval)
          }}
          onGenerateAssessmentLines={generation.generateAssessmentLines}
          onShowOverlaysChange={(visible) =>
            updateSettings('showOverlays', visible)
          }
          onStationingChanged={() => {
            figureElements.updateCenterlineStationing({ overrides: {} })
            setSelectedStationLabelId(null)
          }}
          onReset={resetProject}
        />
      }
      mapContent={
          <WseMapCanvas
            scene={scene}
            ready={ready}
            busy={busy}
            figureLabel={ACTIVE_FIGURE.label}
            canvasRef={canvasRef}
            canvasFrameRef={canvasFrameRef}
            displaySize={canvasDisplaySize}
            annotationTool={annotationTool}
            annotationDragging={annotationDragging}
            assessmentCalloutDragging={assessmentCalloutDragging}
            stationLabelDragging={stationLabelDragging}
            hoveredElement={hoveredElement}
            elementDragging={elementDragging}
            onGenerate={generation.generateMap}
            onPointerDown={mapInteractions.handlePointerDown}
            onPointerMove={mapInteractions.handlePointerMove}
            onPointerUp={mapInteractions.handlePointerUp}
            onPointerCancel={mapInteractions.handlePointerCancel}
            onPointerLeave={() => {
              if (!elementDragging) setHoveredElement(null)
            }}
          />
      }
      settingsContent={
        <WseSettingsContent
          activeSection={activeSettingsSection}
          settings={settings}
          assessmentLabel={assessmentLabel}
          activeElement={activeElement}
          selectedStationLabelId={selectedStationLabelId}
          centerlineStationTicks={centerlineStationTicks}
          hasCenterline={Boolean(selectedCenterline)}
          centerlineCandidates={centerlineCandidates}
          centerlineId={assessmentState.centerlineId}
          centerlineDirection={assessmentState.direction}
          startStation={assessmentState.startStation}
          sceneReady={Boolean(scene)}
          figureElements={figureElements}
          annotationController={annotationController}
          updateSettings={updateSettings}
          onActiveElementChange={setActiveElement}
          onStationLabelSelect={setSelectedStationLabelId}
          onCenterlineChange={stationingSourceActions.changeCenterline}
          onCenterlineDirectionChange={stationingSourceActions.changeDirection}
          onStartStationChange={stationingSourceActions.changeStartStation}
          onDryDepthChange={(dryDepth) => {
            updateSettings('dryDepth', dryDepth)
            setScene(null)
            assessmentWorkflow.clear(settings.assessmentLineInterval)
          }}
          onDownload={downloadMap}
        />
      }
      settingsFooter={
        <div className="generate-bar">
          <button
            className="button primary full"
            type="button"
            disabled={!ready || busy}
            data-testid="generate-map"
            onClick={generation.generateMap}
          >
            <Map size={18} aria-hidden="true" />
            {scene ? 'Regenerate map' : 'Generate map'}
          </button>
          {!ready ? (
            <span className="generate-hint">
              <AlertCircle size={14} aria-hidden="true" />
              Add Baseline and Comparison scenarios first
            </span>
          ) : null}
        </div>
      }
      figurePicker={<FigurePicker />}
    />
  )
}
