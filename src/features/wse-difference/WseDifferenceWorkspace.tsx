import {
  AlertCircle,
  Map,
  MapPin,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import '../../App.css'
import { FigureEditorShell } from '../../components/editor/FigureEditorShell'
import { FigureMapWorkspace } from '../../components/editor/FigureMapWorkspace'
import { FigureSettingsSidebar } from '../../components/editor/FigureSettingsSidebar'
import { ProjectDataPanel } from '../../components/ProjectDataPanel'
import {
  createWseDifferenceRenderDocument,
} from '../../core/mapRenderer'
import { importHydraulicFiles } from '../../application/importHydraulicFiles'
import { importOverlayArchives } from '../../application/importOverlayArchives'
import {
  loadHydraulicProject,
  saveHydraulicProject,
} from '../../application/hydraulicProjectFiles'
import { browserProjectFilePort } from '../../infrastructure/browser/browserProjectFilePort'
import { shapefileArchivePort } from '../../infrastructure/shapefiles/shapefileArchivePort'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useProjectSession } from '../project-session/useProjectSession'
import { useHydraulicProjectDocument } from '../project-document/useHydraulicProjectDocument'
import { downloadWseDifferencePng } from './exportWseDifference'
import { useAssessmentMapLayers } from './useAssessmentMapLayers'
import { wseDifferenceFigure } from './wseDifferenceFigure'
import type {
  ConditionKey,
  FigureSettings,
  IngestNotice,
  MapOverlay,
  ScenarioRole,
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
  createWseProjectSnapshot,
  hydrateWseProject,
} from './wseProjectDocument'
import {
  WSE_SETTINGS_SECTIONS,
  wseSettingsSectionByKey,
  type WseSettingsSectionContext,
} from './wseSettingsSections'

const ACTIVE_FIGURE = wseDifferenceFigure

export function WseDifferenceWorkspace() {
  const projectSession = useProjectSession()
  const projectDocument = useHydraulicProjectDocument()
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

  const handleSettingsTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % WSE_SETTINGS_SECTIONS.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex =
        (index - 1 + WSE_SETTINGS_SECTIONS.length) %
        WSE_SETTINGS_SECTIONS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = WSE_SETTINGS_SECTIONS.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextSection = WSE_SETTINGS_SECTIONS[nextIndex]
    setActiveSettingsSection(nextSection.key)
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      )
    tabs?.[nextIndex]?.focus()
  }

  const handleH5Files = async (files: File[]) => {
    setBusy(true)
    setScene(null)
    assessmentWorkflow.invalidate(settings.assessmentLineInterval)
    try {
      const incoming = await importHydraulicFiles(files, {
        ingest: projectSession.ingest,
      })
      appendNotices(incoming)
    } finally {
      setBusy(false)
    }
  }

  const handleOverlayFiles = async (files: File[]) => {
    setBusy(true)
    try {
      const result = await importOverlayArchives(
        files,
        overlays.length,
        shapefileArchivePort,
      )
      setOverlays((current) => [...current, ...result.overlays])
      appendNotices(result.notices)
    } finally {
      setBusy(false)
    }
  }

  const removeHydraulicCondition = (key: ConditionKey) => {
    projectSession.removeCondition(key)
    setScene(null)
    if (key === assessmentScenarioId) {
      assessmentWorkflow.clear(settings.assessmentLineInterval)
    }
  }

  const renameHydraulicCondition = (key: ConditionKey, label: string) => {
    projectSession.renameCondition(key, label)
  }

  const changeScenarioRole = (role: ScenarioRole, key: ConditionKey) => {
    setScene(null)
    projectSession.changeRole(role, key)
    if (role === 'assessment') {
      assessmentWorkflow.clear(settings.assessmentLineInterval)
    }
  }

  const changeScenarioRun = (key: ConditionKey, index: number) => {
    projectSession.changeRun(key, index)
    setScene(null)
    if (key === assessmentScenarioId) {
      assessmentWorkflow.clear(settings.assessmentLineInterval)
    }
  }

  const generateAssessmentLines = () => {
    setBusy(true)
    try {
      const collection = engine.buildWseAssessmentLines(
        assessmentScenarioId,
        assessmentRun,
        settings.dryDepth,
        settings.assessmentLineInterval,
      )
      if (collection.lines.length === 0) {
        throw new Error(
          `No ${assessmentLabel} WSE assessment lines were found at this interval and dry-depth threshold.`,
        )
      }
      assessmentWorkflow.setCollection(collection)
      appendNotices([
        {
          level: 'success',
          text: `Generated ${collection.lines.length.toLocaleString()} ${assessmentLabel} WSE assessment lines across ${collection.levelCount.toLocaleString()} elevation levels.`,
        },
      ])
      return collection
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
      return null
    } finally {
      setBusy(false)
    }
  }

  const generateMap = () => {
    setBusy(true)
    try {
      const nextScene = ACTIVE_FIGURE.buildScene({
        engine,
        baselineId: baselineScenarioId,
        baselineRun,
        comparisonId: comparisonScenarioId,
        comparisonRun,
        dryDepth: settings.dryDepth,
      })
      if (nextScene.validDifferenceNodes === 0) {
        throw new Error(
          'The selected runs have no overlapping valid WSE values at this dry-depth threshold.',
        )
      }
      setScene(nextScene)
      const nextAssessmentLines = engine.buildWseAssessmentLines(
        assessmentScenarioId,
        assessmentRun,
        settings.dryDepth,
        settings.assessmentLineInterval,
      )
      assessmentWorkflow.setCollection(nextAssessmentLines)
      appendNotices([
        {
          level: 'success',
          text: `WSE difference ready from ${nextScene.validDifferenceNodes.toLocaleString()} comparable ${baselineLabel} nodes with ${nextAssessmentLines.lines.length.toLocaleString()} ${assessmentLabel} WSE assessment lines.`,
        },
      ])
      setLeftOpen(false)
      setRightOpen(false)
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

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

  const updateOverlay = (id: string, patch: Partial<MapOverlay>) => {
    setOverlays((current) =>
      current.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
    )
  }

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

  const saveProject = () => {
    const snapshot = createWseProjectSnapshot({
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
    })
    saveHydraulicProject(snapshot, browserProjectFilePort)
  }

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const project = await loadHydraulicProject(
        file,
        browserProjectFilePort,
      )
      const loaded = hydrateWseProject(
        project,
        figureDocument.document,
        projectDocument.document,
      )
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
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Project could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    }
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
    <FigureEditorShell
      workspaceLabel={ACTIVE_FIGURE.workspaceLabel}
      figureLabel={ACTIVE_FIGURE.label}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      onSave={saveProject}
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
      loadInput={
          <input
            ref={projectInputRef}
            className="visually-hidden"
            type="file"
            accept=".hydfig,.json"
            onChange={loadProject}
          />
      }
    >
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
          onH5Files={handleH5Files}
          onOverlayFiles={handleOverlayFiles}
          onRemoveCondition={removeHydraulicCondition}
          onRenameCondition={renameHydraulicCondition}
          onRoleChange={changeScenarioRole}
          onRunChange={changeScenarioRun}
          runsFor={(key) => engine.runOptions(key)}
          onAssessmentIntervalChange={(interval) => {
            updateSettings('assessmentLineInterval', interval)
            assessmentWorkflow.clear(interval)
          }}
          onGenerateAssessmentLines={generateAssessmentLines}
          onClearAssessmentLines={() =>
            assessmentWorkflow.clear(settings.assessmentLineInterval)
          }
          onShowOverlaysChange={(visible) =>
            updateSettings('showOverlays', visible)
          }
          onUpdateOverlay={updateOverlay}
          onRemoveOverlay={(id) =>
            setOverlays((current) =>
              current.filter((overlay) => overlay.id !== id),
            )
          }
          onReset={resetProject}
        />

        <FigureMapWorkspace
          figureLabel={ACTIVE_FIGURE.label}
          comparisonDescription={`${comparisonLabel} minus ${baselineLabel}`}
          busy={busy}
          notices={notices}
          onZoomOut={() =>
            updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))
          }
          onZoomIn={() =>
            updateSettings('zoom', Math.min(4, settings.zoom + 0.1))
          }
          onFitFrame={figureElements.resetView}
        >
            {!scene ? (
              <div className="map-empty">
                <div className="empty-symbol">
                  <MapPin size={28} />
                </div>
                <h2>Build a {ACTIVE_FIGURE.label} figure</h2>
                <p>
                  Add at least two scenario geometry and datasets pairs on the
                  left, assign the Baseline and Comparison roles, then generate
                  the map.
                </p>
                <button
                  className="button primary"
                  type="button"
                  disabled={!ready || busy}
                  data-testid="generate-empty-map"
                  onClick={generateMap}
                >
                  <Map size={17} aria-hidden="true" />
                  Generate {ACTIVE_FIGURE.label}
                </button>
              </div>
            ) : null}
            <div className="map-canvas-frame" ref={canvasFrameRef}>
              <canvas
                ref={canvasRef}
                className={scene ? 'map-canvas is-visible' : 'map-canvas'}
                aria-label="Generated WSE difference figure"
                data-annotation-tool={annotationTool}
                data-annotation-dragging={
                  annotationDragging ? 'true' : undefined
                }
                data-assessment-callout-dragging={
                  assessmentCalloutDragging ? 'true' : undefined
                }
                data-station-label-dragging={
                  stationLabelDragging ? 'true' : undefined
                }
                data-element-hover={hoveredElement ?? undefined}
                data-element-dragging={
                  elementDragging ? 'true' : undefined
                }
                onPointerDown={mapInteractions.handlePointerDown}
                onPointerMove={mapInteractions.handlePointerMove}
                onPointerUp={mapInteractions.handlePointerUp}
                onPointerCancel={mapInteractions.handlePointerCancel}
                onPointerLeave={() => {
                  if (!elementDragging) setHoveredElement(null)
                }}
                style={{
                  width: canvasDisplaySize.width || undefined,
                  height: canvasDisplaySize.height || undefined,
                }}
              />
            </div>
        </FigureMapWorkspace>

        <FigureSettingsSidebar<SettingsSectionKey>
          mobileOpen={rightOpen}
          sections={WSE_SETTINGS_SECTIONS}
          activeSection={activeSettingsSection}
          onSectionChange={setActiveSettingsSection}
          onSectionKeyDown={handleSettingsTabKeyDown}
          onMobileClose={() => setRightOpen(false)}
          footer={
            <div className="generate-bar">
              <button
                className="button primary full"
                type="button"
                disabled={!ready || busy}
                data-testid="generate-map"
                onClick={generateMap}
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
        >
          <ActiveSettingsSection context={settingsSectionContext} />
        </FigureSettingsSidebar>
    </FigureEditorShell>
  )
}
