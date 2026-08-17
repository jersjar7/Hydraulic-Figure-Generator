import { useRef, useState } from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import type { ScenarioRoleOption } from '../../components/project-data/projectWorkflowTypes'
import type {
  MapElementBounds,
  PlanViewResultScene,
} from '../../core/types'
import { FigureProductionModeSwitcher } from '../figure-sets/FigureProductionModeSwitcher'
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { useMapElementController } from '../figures/useMapElementController'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import type { PlanViewResultSettingsSectionKey } from './planViewResultDefinition'
import { planViewResultFigure } from './planViewResultFigure'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'
import { PlanViewResultSettingsPanel } from './PlanViewResultSettingsPanel'
import { PlanViewFigureSetPanel } from './PlanViewFigureSetPanel'
import { PlanViewFigureDocumentPanel } from './PlanViewFigureDocumentPanel'
import {
  PLAN_VIEW_FIGURE_SET_SETTINGS,
  type PlanViewFigureSetSettingsSectionKey,
} from './planViewFigureSetDefinition'
import {
  PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS,
  type PlanViewFigureDocumentSettingsSectionKey,
} from './planViewFigureDocumentDefinition'
import { PLAN_VIEW_RESULT_WORKSPACE_SETTINGS } from './planViewResultSettingsSections'
import { usePlanViewResultRendering } from './usePlanViewResultRendering'
import { usePlanViewFigureSet } from './usePlanViewFigureSet'
import { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
import { PlanViewWorkspaceFooter } from './PlanViewWorkspaceFooter'
import { PlanViewWorkspaceMap } from './PlanViewWorkspaceMap'
import { usePlanViewStationing } from './usePlanViewStationing'
import { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'
import { usePlanViewResultSelection } from './usePlanViewResultSelection'
import { usePlanViewAnnotations } from './usePlanViewAnnotations'
import { usePlanViewMapInteractions } from './usePlanViewMapInteractions'
import { usePlanViewWorkspaceUi } from './usePlanViewWorkspaceUi'
import { usePlanViewSingleFigure } from './usePlanViewSingleFigure'
import { usePlanViewWorkspaceLifecycle } from './usePlanViewWorkspaceLifecycle'
import { createPlanViewWorkspaceOutputController } from './planViewWorkspaceOutputController'
import { usePlanViewBatchProduction } from './usePlanViewBatchProduction'

const SCENARIO_ROLES: readonly ScenarioRoleOption[] = [
  { role: 'baseline', label: 'Scenario', required: true },
]

type WorkspaceSettingsSectionKey =
  | PlanViewResultSettingsSectionKey
  | PlanViewFigureSetSettingsSectionKey
  | PlanViewFigureDocumentSettingsSectionKey

export function PlanViewResultWorkspace() {
  const {
    projectSession,
    projectDocument,
    reportAssembly,
    projectCommands,
  } = useHydraulicProjectWorkspace()
  const { engine, scenarios, baselineId, runByScenario } = projectSession
  const { overlays } = projectDocument
  const runIndex = runByScenario[baselineId] ?? 0
  const [settings, setSettings] = useState(createDefaultPlanViewResultSettings)
  const [scene, setScene] = useState<PlanViewResultScene | null>(null)
  const ui = usePlanViewWorkspaceUi()
  const {
    notices,
    busy,
    leftOpen,
    leftCollapsed,
    rightOpen,
    productionMode,
    activeSection,
    activeElement,
    setBusy,
    setLeftOpen,
    setLeftCollapsed,
    setRightOpen,
    setProductionMode,
    setActiveSection,
    setActiveElement,
    appendNotices,
  } = ui
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const elementBoundsRef = useRef<MapElementBounds[]>([])
  const stationingSource = useCenterlineStationingSource()
  const displaySize = useFittedCanvasAspect(
    canvasFrameRef,
    settings.orientation === 'landscape' ? 1650 / 1275 : 1275 / 1650,
  )
  const { resultOptions, selectedResult, ready } = usePlanViewResultSelection({
    engine,
    scenarioId: baselineId,
    runIndex,
    scenarioRevision: scenarios,
    settings,
    setSettings,
  })
  const scenarioLabel = engine.condition(baselineId)?.label ?? 'Scenario'
  const elements = useMapElementController(
    settings,
    setSettings,
    activeElement,
    productionMode === 'figure' && activeSection === 'elements',
  )
  const stationing = usePlanViewStationing({
    engine,
    scenarioId: baselineId,
    overlays,
    settings,
    setSettings,
    sourceController: stationingSource,
  })
  const mapBounds = engine.commonBounds([baselineId])
  const annotations = usePlanViewAnnotations({
    bounds: mapBounds,
    settings,
    sceneReady: Boolean(scene),
    keyboardEnabled:
      productionMode === 'figure' && activeSection === 'annotations',
  })
  const mapInteractions = usePlanViewMapInteractions({
    enabled: Boolean(scene && productionMode === 'figure'),
    bounds: mapBounds,
    settings,
    activeSection,
    elementBoundsRef,
    elements,
    annotations,
    stationLayers: stationing.layers,
    setActiveCenterline: stationingSource.setActiveCenterline,
    selectStationLabel: stationing.panelProps.onSelectLabel,
    updateStationOverride: stationing.controller.updateLabelOverride,
    selectElement: setActiveElement,
    openElements: () => {
      setActiveSection('elements')
      setRightOpen(true)
    },
    openAnnotations: () => {
      setActiveSection('annotations')
      setRightOpen(true)
    },
    openStationing: () => {
      setActiveSection('stationing')
      setRightOpen(true)
    },
  })
  const figureSet = usePlanViewFigureSet({
    engine,
    scenarios,
    baselineId,
    runByScenario,
    overlays,
    stationingSource: stationing.source,
    baseSettings: settings,
    appendNotices,
  })
  const figureDocument = usePlanViewFigureDocument({
    engine,
    overlays,
    stationingSource: stationing.source,
    figureSet,
    appendNotices,
  })

  const singleFigure = usePlanViewSingleFigure({
    engine,
    scenarioId: baselineId,
    runIndex,
    scenarioLabel,
    ready,
    resultOptions,
    settings,
    setSettings,
    setScene,
    figureSet,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    clearElementHistory: elements.clearHistory,
    showFigure: () => {
      setProductionMode('figure')
      setActiveSection('result')
    },
    appendNotices,
  })
  usePlanViewResultRendering({
    canvasRef,
    elementBoundsRef,
    scene,
    engine,
    settings,
    overlays,
    centerlineStationing: stationing.layers,
    annotations: annotations.annotations,
    selectedAnnotationId: annotations.selectedId,
    selectedElementKey:
      activeSection === 'elements' ? activeElement : null,
    setBusy,
    appendNotices,
    interacting: mapInteractions.dragging,
  })

  const lifecycle = usePlanViewWorkspaceLifecycle({
    projectSession,
    projectDocument,
    settings,
    setSettings,
    setScene,
    figureSet,
    figureDocument,
    stationingSource,
    stationing,
    annotations,
    elements,
    singleFigure,
    ui,
    elementBoundsRef,
    resetMapInteractions: mapInteractions.resetInteractions,
    appendNotices,
  })
  const batchReportExport = usePlanViewBatchProduction({
    projectSession,
    projectDocument,
    reportAssembly,
    figureSet,
    figureDocument,
    stationingSource,
    renderStationingSource: stationing.source,
    annotations,
    appendNotices,
  })
  const output = createPlanViewWorkspaceOutputController({
    canvasRef,
    scene,
    engine,
    settings,
    overlays,
    centerlineStationing: stationing.layers,
    annotations: annotations.annotations,
    captureDraft: lifecycle.draftRetention.capture,
    appendNotices,
  })

  return (
    <FigureWorkspaceScaffold<WorkspaceSettingsSectionKey>
      figureLabel={productionMode === 'figure'
        ? planViewResultFigure.label
        : productionMode === 'set' ? 'Batch Figures' : 'Quick Word Export'}
      comparisonDescription={productionMode === 'figure'
            ? `${scenarioLabel} · ${selectedResult?.label ?? 'Select map content'}`
        : productionMode === 'set'
          ? `${figureSet.draftCount} figure${figureSet.draftCount === 1 ? '' : 's'} selected`
          : `${figureDocument.pages.length} page${figureDocument.pages.length === 1 ? '' : 's'} assembled`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={productionMode === 'figure' && busy}
      notices={notices}
      settingsSections={productionMode === 'figure'
        ? PLAN_VIEW_RESULT_WORKSPACE_SETTINGS
        : productionMode === 'set'
          ? PLAN_VIEW_FIGURE_SET_SETTINGS
          : PLAN_VIEW_FIGURE_DOCUMENT_SETTINGS}
      activeSettingsSection={productionMode === 'figure'
        ? activeSection
        : productionMode === 'set' ? 'figure-set' : 'figure-document'}
      onOpenLeftPanel={() => { setLeftCollapsed(false); setLeftOpen(true) }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => { setLeftOpen(false); setRightOpen(false) }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={(section) => {
        if (section !== 'figure-set' && section !== 'figure-document') {
          setActiveSection(section)
        }
      }}
      onZoomOut={() => singleFigure.updateSetting('zoom', Math.max(0.35, settings.zoom - 0.1))}
      onZoomIn={() => singleFigure.updateSetting('zoom', Math.min(4, settings.zoom + 0.1))}
      onFitFrame={elements.resetView}
      mapToolbarContent={
        <FigureProductionModeSwitcher
          value={productionMode}
          onChange={(mode) => {
            mapInteractions.resetInteractions()
            setProductionMode(mode)
            if (mode !== 'figure') singleFigure.stopEditingFigureSetItem()
          }}
        />
      }
      showMapActions={productionMode === 'figure'}
      settingsHeading={productionMode === 'figure'
        ? 'Figure settings'
        : productionMode === 'set' ? 'Batch figures' : 'Quick Word Export'}
      projectPanel={
        <HydraulicProjectPanel
          inputCapabilities={planViewResultFigure.editor.inputs}
          scenarioRoles={SCENARIO_ROLES}
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          projectSession={projectSession}
          overlays={overlays}
          showOverlays={settings.showOverlays}
          projectInputs={lifecycle.projectInputs}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onShowOverlaysChange={(visible) => singleFigure.updateSetting('showOverlays', visible)}
          onReset={() =>
            projectCommands.confirmWorkspaceReset(lifecycle.resetProject)
          }
        />
      }
      mapContent={
        <PlanViewWorkspaceMap
          mode={productionMode}
          scene={scene}
          canvasRef={canvasRef}
          canvasFrameRef={canvasFrameRef}
          displaySize={displaySize}
          figureSet={figureSet}
          figureDocument={figureDocument}
          hasScenarios={scenarios.length > 0}
          onOpenFigure={singleFigure.openFigureSetItem}
          stationLabelDragging={mapInteractions.stationLabelDragging}
          elementDragging={mapInteractions.elementDragging}
          hoveredElement={mapInteractions.hoveredElement}
          annotationTool={annotations.tool}
          onPointerDown={mapInteractions.handlePointerDown}
          onPointerMove={mapInteractions.handlePointerMove}
          onPointerUp={mapInteractions.handlePointerUp}
          onPointerCancel={mapInteractions.handlePointerCancel}
          onPointerLeave={mapInteractions.handlePointerLeave}
        />
      }
      settingsContent={
        productionMode === 'figure' ? (
          <PlanViewResultSettingsPanel
            section={activeSection}
            settings={settings}
            resultOptions={resultOptions}
            activeElement={activeElement}
            elements={elements}
            stationing={stationing.panelProps}
            annotations={annotations.controller}
            canDownload={Boolean(scene)}
            onSettingsChange={singleFigure.updateSetting}
            onCartographyChange={singleFigure.updateCartography}
            onResultParameterChange={singleFigure.changeResult}
            onActiveElementChange={setActiveElement}
            exportActions={
              <ReportFigureExportActions
                workspaceId={planViewResultFigure.id}
                canExport={Boolean(scene && canvasRef.current)}
                createFigure={output.createExportFigure}
                onSuccess={(text) => appendNotices([{ level: 'success', text }])}
              />
            }
            onDownload={output.download}
          />
        ) : productionMode === 'set' ? (
          <PlanViewFigureSetPanel
            engine={engine}
            scenarios={scenarios}
            controller={figureSet}
            includedCount={batchReportExport.includedCount}
            addingToExport={batchReportExport.adding}
            exportProgress={batchReportExport.progress}
            onAddToExport={() => void batchReportExport.addIncluded()}
            onCancelAddToExport={batchReportExport.cancel}
            onQuickWordExport={() => setProductionMode('document')}
          />
        ) : (
          <PlanViewFigureDocumentPanel
            controller={figureDocument}
            onManageFigures={() => setProductionMode('set')}
          />
        )
      }
      settingsFooter={
        <PlanViewWorkspaceFooter
          mode={productionMode}
          ready={ready}
          busy={busy}
          scene={scene}
          figureSet={figureSet}
          figureDocument={figureDocument}
          onGenerateFigure={singleFigure.generate}
        />
      }
    />
  )
}
