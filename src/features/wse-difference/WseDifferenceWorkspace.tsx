import {
  AlertCircle,
  Map,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { ProjectDataPanel } from '../../components/ProjectDataPanel'
import {
  createWseDifferenceRenderDocument,
} from '../../core/mapRenderer'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { FigurePicker } from '../figures/FigurePicker'
import { downloadWseDifferencePng } from './exportWseDifference'
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
import {
  WSE_SETTINGS_SECTIONS,
  wseSettingsSectionByKey,
  type WseSettingsSectionContext,
} from './wseSettingsSections'
import { WseMapCanvas } from './components/WseMapCanvas'
import { useWseGenerationController } from './useWseGenerationController'
import { useWseProjectFiles } from './useWseProjectFiles'
import { useWseProjectInputs } from './useWseProjectInputs'

const ACTIVE_FIGURE = wseDifferenceFigure

export function WseDifferenceWorkspace() {
  const { projectSession, projectDocument } = useHydraulicProjectWorkspace()
  const figureDocument = useWseFigureDocument()
  const editorUi = useWseEditorUi()
  const {
    engine,
    scenarios,
    baselineId: baselineScenarioId,
    comparisonId: comparisonScenarioId,
    assessmentId: assessmentScenarioId,
    runByScenario,
  } = projectSession
  const {
    settings,
    annotations,
    annotationDefaults,
    setSettings,
    setAnnotations,
    setAnnotationDefaults,
    loadDocument,
    resetDocument,
  } = figureDocument
  const {
    overlays,
    setOverlays,
    loadDocument: loadProjectDocument,
    resetDocument: resetProjectDocument,
  } = projectDocument
  const assessmentWorkflow = useAssessmentWorkflow(1)
  const assessmentState = assessmentWorkflow.state
  const assessmentLines = assessmentState.collection
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
  const baselineCondition = engine.condition(baselineScenarioId)
  const comparisonCondition = engine.condition(comparisonScenarioId)
  const assessmentCondition = engine.condition(assessmentScenarioId)
  const baselineRun = runByScenario[baselineScenarioId] ?? 0
  const comparisonRun = runByScenario[comparisonScenarioId] ?? 0
  const assessmentRun = runByScenario[assessmentScenarioId] ?? 0
  const ready = ACTIVE_FIGURE.canGenerate({
    engine,
    baselineId: baselineScenarioId,
    baselineRun,
    comparisonId: comparisonScenarioId,
    comparisonRun,
    dryDepth: settings.dryDepth,
  })
  const baselineLabel = baselineCondition?.label ?? 'Baseline'
  const comparisonLabel = comparisonCondition?.label ?? 'Comparison'
  const assessmentLabel = assessmentCondition?.label ?? 'Assessment source'
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
  })
  const figureElements = useWseFigureElementController({
    engine,
    settings,
    stationingLayer: centerlineStationLayer,
    selectedStationLabelId,
    setSettings,
    setSelectedStationLabelId,
  })

  useEffect(() => {
    if (
      selectedStationLabelId &&
      !centerlineStationTicks.some(
        (tick) => tick.id === selectedStationLabelId && tick.label,
      )
    ) {
      setSelectedStationLabelId(null)
    }
  }, [
    centerlineStationTicks,
    selectedStationLabelId,
    setSelectedStationLabelId,
  ])

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

  const projectInputs = useWseProjectInputs({
    assessmentId: assessmentScenarioId,
    settings,
    overlays,
    ingest: projectSession.ingest,
    removeCondition: projectSession.removeCondition,
    renameCondition: projectSession.renameCondition,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    setOverlays,
    setScene,
    invalidateAssessment: assessmentWorkflow.invalidate,
    clearAssessment: assessmentWorkflow.clear,
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
      activeSettingsSection === 'elements' &&
      activeElement !== 'stationing'
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
      setActiveSettingsSection('elements')
      setActiveElement('stationing')
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

  const downloadMap = async () => {
    if (!scene) return
    setBusy(true)
    try {
      await downloadWseDifferencePng({
        document: createWseDifferenceRenderDocument({
          scene,
          commonBounds: engine.commonBounds(),
          settings,
          overlays,
          assessment: assessmentExportLayer,
          annotations,
        }),
      })
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Map export failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const projectFiles = useWseProjectFiles({
    snapshot: {
      settings,
      overlays,
      annotations,
      annotationDefaults,
      scenarioSelection: {
        baselineId: baselineScenarioId,
        comparisonId: comparisonScenarioId,
        assessmentId: assessmentScenarioId,
        runByScenario,
        labels: Object.fromEntries(
          scenarios.map((scenario) => [scenario.key, scenario.label]),
        ),
      },
      assessment: {
        centerlineId: assessmentState.centerlineId,
        direction: assessmentState.direction,
        startStation: assessmentState.startStation,
        overrides: assessmentState.overrides,
      },
    },
    currentFigure: figureDocument.document,
    currentProject: projectDocument.document,
    appendNotices,
  })

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const loaded = await projectFiles.loadProjectFile(file)
    if (!loaded) return
    loadDocument(loaded.document)
    loadProjectDocument(loaded.project)
    setSelectedAnnotationId(null)
    setSelectedStationLabelId(null)
    setAnnotationStart(null)
    setAnnotationPanelView('create')
    setAnnotationPlacedView('list')
    setAnnotationEditorView('content')
    setLeftCollapsed(false)
    projectSession.loadSelection(loaded.scenarioSelection)
    setScene(null)
    assessmentWorkflow.load(
      loaded.assessment,
      loaded.document.settings.assessmentLineInterval,
    )
    appendNotices([
      {
        level: 'success',
        text: 'Project settings loaded. Re-add the H5 files to regenerate the map.',
      },
    ])
  }

  const settingsSectionContext: WseSettingsSectionContext = {
    calculation: {
      settings,
      assessmentLabel,
      onSettingsChange: updateSettings,
      onDryDepthChange: (dryDepth) => {
        updateSettings('dryDepth', dryDepth)
        setScene(null)
        assessmentWorkflow.clear(settings.assessmentLineInterval)
      },
    },
    legend: {
      settings,
      onSettingsChange: updateSettings,
    },
    frame: {
      settings,
      onSettingsChange: updateSettings,
      onResetView: figureElements.resetView,
    },
    elements: {
      settings,
      activeElement,
      onActiveElementChange: setActiveElement,
      onVisibilityChange: figureElements.updateElementVisibility,
      onTitleTemplateChange: (value) =>
        updateSettings('titleTemplate', value),
      onStyleChange: figureElements.updateElementStyle,
      onPositionChange: figureElements.updateElementPosition,
      onNudge: figureElements.nudgeElement,
      onResetElement: figureElements.resetElement,
      stationTicks: centerlineStationTicks,
      selectedStationLabelId,
      hasCenterline: Boolean(selectedCenterline),
      onStationingChange: figureElements.updateCenterlineStationing,
      onStationLabelSelect: setSelectedStationLabelId,
      onStationLabelOverrideChange:
        figureElements.updateStationLabelOverride,
      onNudgeStationLabel: figureElements.nudgeStationLabel,
      onResetStationing: figureElements.resetCenterlineStationing,
    },
    annotations: {
      model: annotationController.model,
      actions: annotationController.actions,
    },
    export: {
      canDownload: Boolean(scene),
      onDownload: downloadMap,
    },
  }
  const ActiveSettingsSection =
    wseSettingsSectionByKey(activeSettingsSection).component

  return (
    <FigureWorkspaceScaffold<SettingsSectionKey>
      workspaceLabel={ACTIVE_FIGURE.workspaceLabel}
      figureLabel={ACTIVE_FIGURE.label}
      comparisonDescription={`${comparisonLabel} minus ${baselineLabel}`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={busy}
      notices={notices}
      settingsSections={WSE_SETTINGS_SECTIONS}
      activeSettingsSection={activeSettingsSection}
      onSave={projectFiles.saveProject}
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
          onChange={loadProject}
        />
      }
      projectPanel={
        <ProjectDataPanel
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          scenarios={scenarios}
          baselineId={baselineScenarioId}
          comparisonId={comparisonScenarioId}
          assessmentId={assessmentScenarioId}
          runByScenario={runByScenario}
          assessmentLines={assessmentLines}
          assessmentReview={{
            view: assessmentState.panelView,
            candidates: centerlineCandidates,
            centerlineId: assessmentState.centerlineId,
            direction: assessmentState.direction,
            startStation: assessmentState.startStation,
            reviewTab: assessmentState.reviewTab,
            selectedLineId: assessmentState.selectedLineId,
            overrides: assessmentState.overrides,
            stationed: stationedAssessmentLines,
            onOpen: assessmentWorkflow.openReview,
            onBack: assessmentWorkflow.closeReview,
            onCenterlineChange: (id) => {
              assessmentWorkflow.setCenterline(id)
              figureElements.updateCenterlineStationing({ overrides: {} })
              setSelectedStationLabelId(null)
            },
            onDirectionChange: (direction) => {
              assessmentWorkflow.setDirection(direction)
              figureElements.updateCenterlineStationing({ overrides: {} })
              setSelectedStationLabelId(null)
            },
            onStartStationChange: (station) => {
              assessmentWorkflow.setStartStation(station)
              figureElements.updateCenterlineStationing({ overrides: {} })
              setSelectedStationLabelId(null)
            },
            onReviewTabChange: assessmentWorkflow.setReviewTab,
            onSelectLine: (id) =>
              assessmentWorkflow.selectLine(
                assessmentState.selectedLineId === id ? null : id,
              ),
            onSetOverride: assessmentWorkflow.setOverride,
          }}
          overlays={overlays}
          showOverlays={settings.showOverlays}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onH5Files={projectInputs.handleH5Files}
          onOverlayFiles={projectInputs.handleOverlayFiles}
          onRemoveCondition={projectInputs.removeHydraulicCondition}
          onRenameCondition={projectInputs.renameHydraulicCondition}
          onRoleChange={projectInputs.changeScenarioRole}
          onRunChange={projectInputs.changeScenarioRun}
          runsFor={(key) => engine.runOptions(key)}
          onAssessmentIntervalChange={(interval) => {
            updateSettings('assessmentLineInterval', interval)
            assessmentWorkflow.clear(interval)
          }}
          onGenerateAssessmentLines={generation.generateAssessmentLines}
          onClearAssessmentLines={() =>
            assessmentWorkflow.clear(settings.assessmentLineInterval)
          }
          onShowOverlaysChange={(visible) =>
            updateSettings('showOverlays', visible)
          }
          onUpdateOverlay={projectInputs.updateOverlay}
          onRemoveOverlay={(id) =>
            setOverlays((current) =>
              current.filter((overlay) => overlay.id !== id),
            )
          }
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
        <ActiveSettingsSection context={settingsSectionContext} />
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
