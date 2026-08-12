import { Map } from 'lucide-react'
import { useRef, useState } from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { wseDifferenceFigure } from './wseDifferenceFigure'
import type { WseDifferenceScene } from '../../core/types'
import type { SettingsSectionKey } from './workspaceConfiguration'
import { useFittedCanvasSize } from './useFittedCanvasSize'
import { useWseEditorUi } from './useWseEditorUi'
import { useWseMapRendering } from './useWseMapRendering'
import { useWseFigureDocument } from './useWseFigureDocument'
import { useWseAnnotationController } from './useWseAnnotationController'
import { useWseFigureElementController } from './useWseFigureElementController'
import { WSE_SETTINGS_SECTIONS } from './wseSettingsSections'
import { WseMapCanvas } from './components/WseMapCanvas'
import { WseSettingsContent } from './components/WseSettingsContent'
import { useWseGenerationController } from './useWseGenerationController'
import { createWseScenarioContext } from './wseScenarioContext'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'
import { useWseWorkspaceLifecycle } from './useWseWorkspaceLifecycle'
import { createWseWorkspaceOutputController } from './wseWorkspaceOutputController'
import { useWseAssessmentComposition } from './useWseAssessmentComposition'
import { useWseWorkspaceMapInteractions } from './useWseWorkspaceMapInteractions'
const ACTIVE_FIGURE = wseDifferenceFigure
export function WseDifferenceWorkspace() {
  const {
    projectSession,
    projectDocument,
    projectCommands,
  } = useHydraulicProjectWorkspace()
  const figureDocument = useWseFigureDocument()
  const editorUi = useWseEditorUi()
  const {
    settings,
    annotations,
    annotationDefaults,
    setSettings,
    updateSetting,
    updateCartography,
    setAnnotations,
    setAnnotationDefaults,
  } = figureDocument
  const { overlays } = projectDocument
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
    setBusy,
    setLeftOpen,
    setLeftCollapsed,
    setRightOpen,
    setActiveSettingsSection,
    setActiveElement,
    setSelectedStationLabelId,
    setHoveredElement,
    appendNotices,
  } = editorUi
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const canvasDisplaySize = useFittedCanvasSize(
    canvasFrameRef,
    settings.orientation,
  )
  const assessment = useWseAssessmentComposition({
    modelWkt: assessmentCondition?.geometry?.wkt,
    overlays,
    settings,
    selectedStationLabelId,
  })
  const {
    centerlineCandidates,
    selectedCenterline,
    centerlineStationTicks,
    centerlineStationLayer,
    activeCenterlineEntry,
    stationedAssessmentLines,
    exportLayer: assessmentExportLayer,
    displayLayer: assessmentDisplayLayer,
  } = assessment
  const figureElements = useWseFigureElementController({
    engine,
    settings,
    stationingLayer: centerlineStationLayer,
    selectedStationLabelId,
    selectedElement: activeElement,
    keyboardEnabled: activeSettingsSection === 'elements',
    setSettings,
    setSelectedStationLabelId,
  })
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
    keyboardEnabled: activeSettingsSection === 'annotations',
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
    setAssessmentCollection: assessment.workflow.setCollection,
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
      activeSettingsSection === 'elements' ? activeElement : null,
    interacting:
      annotationDragging ||
      assessmentCalloutDragging ||
      stationLabelDragging ||
      elementDragging,
    setBusy,
    appendNotices,
  })

  const mapInteractions = useWseWorkspaceMapInteractions({
    scene,
    engine,
    settings,
    elementBoundsRef,
    editorUi,
    figureDocument,
    annotationController,
    figureElements,
    assessment,
  })

  const lifecycle = useWseWorkspaceLifecycle({
    projectSession,
    projectDocument,
    figureDocument,
    editorUi,
    assessmentWorkflow: assessment.workflow,
    stationingSource: assessment.stationingSource,
    figureElements,
    settings,
    setScene,
    elementBoundsRef,
    resetMapInteractions: mapInteractions.resetInteractions,
    appendNotices,
  })
  const output = createWseWorkspaceOutputController({
    canvasRef,
    scene,
    engine,
    settings,
    overlays,
    assessment: assessmentExportLayer,
    annotations,
    captureDraft: lifecycle.workspaceDraft.capture,
    setBusy,
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
        updateSetting('zoom', Math.max(0.35, settings.zoom - 0.1))
      }
      onZoomIn={() =>
        updateSetting('zoom', Math.min(4, settings.zoom + 0.1))
      }
      onFitFrame={figureElements.resetView}
      projectPanel={
        <HydraulicProjectPanel
          inputCapabilities={wseDifferenceFigure.editor.inputs}
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          projectSession={projectSession}
          assessmentWorkflow={assessment.workflow}
          assessmentInterval={settings.assessmentLineInterval}
          centerlineCandidates={centerlineCandidates}
          stationedAssessmentLines={stationedAssessmentLines}
          overlays={overlays}
          showOverlays={settings.showOverlays}
          projectInputs={lifecycle.projectInputs}
          toggleReviewSelection
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onAssessmentIntervalChange={lifecycle.changeAssessmentInterval}
          onGenerateAssessmentLines={generation.generateAssessmentLines}
          onShowOverlaysChange={(visible) =>
            updateSetting('showOverlays', visible)
          }
          onStationingChanged={lifecycle.resetStationingLabels}
          onReset={() =>
            projectCommands.confirmWorkspaceReset(lifecycle.resetProject)
          }
        />
      }
      mapContent={
        <WseMapCanvas
          scene={scene}
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
          centerlineId={assessment.stationingSource.state.activeCenterlineId}
          selectedCenterlineIds={assessment.stationingSource.state.centerlines.map(
            (entry) => entry.centerlineId,
          )}
          centerlineDirection={activeCenterlineEntry?.direction ?? 'a-to-b'}
          startStation={activeCenterlineEntry?.startStation ?? 0}
          sceneReady={Boolean(scene)}
          figureElements={figureElements}
          annotationController={annotationController}
          updateSettings={updateSetting}
          onCartographyChange={updateCartography}
          onActiveElementChange={setActiveElement}
          onStationLabelSelect={setSelectedStationLabelId}
          onCenterlineChange={
            lifecycle.stationingSourceActions.changeActiveCenterline
          }
          onCenterlineToggle={
            lifecycle.stationingSourceActions.toggleCenterline
          }
          onCenterlineDirectionChange={
            lifecycle.stationingSourceActions.changeDirection
          }
          onStartStationChange={
            lifecycle.stationingSourceActions.changeStartStation
          }
          onDryDepthChange={lifecycle.changeDryDepth}
          exportActions={
            <ReportFigureExportActions
              workspaceId={ACTIVE_FIGURE.id}
              canExport={Boolean(scene && canvasRef.current)}
              createFigure={output.createExportFigure}
              onSuccess={(text) =>
                appendNotices([{ level: 'success', text }])
              }
            />
          }
          onDownload={output.downloadMap}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<Map size={18} aria-hidden="true" />}
          label={scene ? 'Regenerate map' : 'Generate map'}
          disabled={!ready || busy}
          testId="generate-map"
          hint={!ready ? 'Add Baseline and Comparison scenarios first' : undefined}
          onClick={generation.generateMap}
        />
      }
    />
  )
}
