import { useCallback, useRef, useState } from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import type { ScenarioRoleOption } from '../../components/project-data/projectWorkflowTypes'
import type {
  CartographySettings, FigureElementPanelKey, IngestNotice,
  MapElementBounds, PlanViewResultScene, PlanViewResultSettings,
} from '../../core/types'
import { createCanvasReportFigure } from '../figures/canvasReportFigure'
import { FigureProductionModeSwitcher, type FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { useMapElementController } from '../figures/useMapElementController'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { exportPlanViewResult } from './exportPlanViewResult'
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
import { usePlanViewWorkspacePersistence } from './usePlanViewWorkspacePersistence'
import { withPlanViewCartographySettings } from './planViewCartography'

const SCENARIO_ROLES: readonly ScenarioRoleOption[] = [
  { role: 'baseline', label: 'Scenario', required: true },
]

type WorkspaceSettingsSectionKey =
  | PlanViewResultSettingsSectionKey
  | PlanViewFigureSetSettingsSectionKey
  | PlanViewFigureDocumentSettingsSectionKey

export function PlanViewResultWorkspace() {
  const { projectSession, projectDocument } = useHydraulicProjectWorkspace()
  const { engine, scenarios, baselineId, runByScenario } = projectSession
  const { overlays, setOverlays, resetDocument } = projectDocument
  const runIndex = runByScenario[baselineId] ?? 0
  const [settings, setSettings] = useState(createDefaultPlanViewResultSettings)
  const [scene, setScene] = useState<PlanViewResultScene | null>(null)
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [productionMode, setProductionMode] =
    useState<FigureProductionMode>('figure')
  const [editingFigureSetItemId, setEditingFigureSetItemId] =
    useState<string | null>(null)
  const [activeSection, setActiveSection] =
    useState<PlanViewResultSettingsSectionKey>('result')
  const [activeElement, setActiveElement] =
    useState<FigureElementPanelKey>('title')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const elementBoundsRef = useRef<MapElementBounds[]>([])
  const projectInputRef = useRef<HTMLInputElement>(null)
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
  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length > 0) {
      setNotices((current) => [...current, ...incoming].slice(-40))
    }
  }, [])
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

  const invalidate = useCallback(() => {
    setScene(null)
    figureSet.markStale()
  }, [figureSet])
  const projectInputs = createHydraulicProjectInputActions({
    assessmentId: projectSession.assessmentId,
    overlays,
    ingest: projectSession.ingest,
    removeCondition: projectSession.removeCondition,
    renameCondition: projectSession.renameCondition,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    setOverlays,
    onFilesChanged: invalidate,
    onSelectionChanged: invalidate,
    onAssessmentSourceChanged: () => undefined,
    setBusy,
    appendNotices,
  })

  const generate = useCallback(() => {
    if (!ready) return
    try {
      const next = planViewResultFigure.buildScene({
        engine,
        scenarioId: baselineId,
        runIndex,
        resultParameter: settings.resultParameter,
      })
      setScene(next)
      setLeftCollapsed(true)
      setLeftOpen(false)
      appendNotices([{
        level: 'success',
        text: `Generated ${next.result.label} from ${scenarioLabel}; ${next.validNodes.toLocaleString()} valid nodes.`,
      }])
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: `Map generation failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
    }
  }, [
    appendNotices,
    baselineId,
    engine,
    ready,
    runIndex,
    scenarioLabel,
    settings.resultParameter,
  ])

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

  const replaceSettings = (next: PlanViewResultSettings) => {
    setSettings(next)
    if (editingFigureSetItemId) figureSet.updateItemSettings(editingFigureSetItemId, next)
  }
  const updateSettings = <Key extends keyof PlanViewResultSettings>(
    key: Key,
    value: PlanViewResultSettings[Key],
  ) => replaceSettings({ ...settings, [key]: value })

  const updateCartography = (cartography: CartographySettings) => {
    replaceSettings(withPlanViewCartographySettings(settings, cartography))
  }

  const changeResult = (paramName: string) => {
    const option = resultOptions.find((item) => item.paramName === paramName)
    if (!option) return
    setSettings((current) => ({
      ...current,
      resultParameter: option.paramName,
      ramp: option.defaultRamp,
      legendMin: null,
      legendMax: null,
      scalarLegendInterval: null,
      elementStyles: {
        ...current.elementStyles,
        diffLegend: {
          ...current.elementStyles.diffLegend,
          title: option.label,
          units: option.units,
        },
      },
    }))
    setScene(null)
    setEditingFigureSetItemId(null)
  }

  const { draftRetention, projectFiles, loadProject } =
    usePlanViewWorkspacePersistence({
      settings, setSettings, scenarios, projectSession, projectDocument,
      figureSet, figureDocument, stationingSource, stationing, annotations,
      elements,
      setScene, appendNotices,
    })

  const resetProject = () => {
    mapInteractions.resetInteractions()
    projectSession.reset()
    resetDocument()
    stationingSource.reset()
    stationing.clearSelection()
    annotations.reset()
    elements.clearHistory()
    elementBoundsRef.current = []
    setSettings(createDefaultPlanViewResultSettings())
    figureSet.reset()
    figureDocument.reset()
    setScene(null)
    setNotices([])
    setLeftCollapsed(false)
    setActiveSection('result')
    setProductionMode('figure')
    setEditingFigureSetItemId(null)
  }

  const openFigureSetItem = (
    item: (typeof figureSet.figureSet.items)[number],
  ) => {
    projectSession.changeRole('baseline', item.selection.scenarioId)
    if (item.selection.kind === 'scalar') {
      projectSession.changeRun(item.selection.scenarioId, item.selection.runIndex)
    }
    setSettings(item.settings)
    setScene(
      figureSet.sceneFor(item.id) ?? planViewResultFigure.buildScene({
        engine,
        ...item.selection,
      }),
    )
    setEditingFigureSetItemId(item.id)
    elements.clearHistory()
    setProductionMode('figure')
    setActiveSection('result')
  }

  const download = () => {
    if (!scene) return
    void exportPlanViewResult({
      scene,
      engine,
      settings,
      overlays,
      centerlineStationing: stationing.layers,
      annotations: annotations.annotations,
      appendNotices,
    })
  }

  const createExportFigure = () => {
    if (!scene || !canvasRef.current) return null
    const title = `${scene.condition.label} - ${scene.result.label}`
    const run = scene.selection ? ` for ${scene.selection.run.name}` : ''
    return createCanvasReportFigure(canvasRef.current, {
      workspaceId: planViewResultFigure.id,
      workspaceLabel: planViewResultFigure.label,
      title,
      caption: `${scene.result.label}${run}, ${scene.condition.label}.`,
      workspaceDraft: draftRetention.capture(),
    })
  }

  return (
    <FigureWorkspaceScaffold<WorkspaceSettingsSectionKey>
      figureLabel={productionMode === 'figure'
        ? planViewResultFigure.label
        : productionMode === 'set' ? 'Figure Set' : 'Word Document'}
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
      onSave={projectFiles.saveProject}
      onLoad={() => projectInputRef.current?.click()}
      onOpenLeftPanel={() => { setLeftCollapsed(false); setLeftOpen(true) }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => { setLeftOpen(false); setRightOpen(false) }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={(section) => {
        if (section !== 'figure-set' && section !== 'figure-document') {
          setActiveSection(section)
        }
      }}
      onZoomOut={() => updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))}
      onZoomIn={() => updateSettings('zoom', Math.min(4, settings.zoom + 0.1))}
      onFitFrame={elements.resetView}
      loadInput={
        <input
          ref={projectInputRef}
          className="visually-hidden"
          type="file"
          accept=".hydfig,.json"
          onChange={loadProject}
        />
      }
      mapToolbarContent={
        <FigureProductionModeSwitcher
          value={productionMode}
          onChange={(mode) => {
            mapInteractions.resetInteractions()
            setProductionMode(mode)
            if (mode !== 'figure') setEditingFigureSetItemId(null)
          }}
        />
      }
      showMapActions={productionMode === 'figure'}
      settingsHeading={productionMode === 'figure'
        ? 'Figure settings'
        : productionMode === 'set' ? 'Figure set' : 'Document'}
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
          projectInputs={projectInputs}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onShowOverlaysChange={(visible) => updateSettings('showOverlays', visible)}
          onReset={resetProject}
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
          onOpenFigure={openFigureSetItem}
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
            onSettingsChange={updateSettings}
            onCartographyChange={updateCartography}
            onResultParameterChange={changeResult}
            onActiveElementChange={setActiveElement}
            exportActions={
              <ReportFigureExportActions
                workspaceId={planViewResultFigure.id}
                canExport={Boolean(scene && canvasRef.current)}
                createFigure={createExportFigure}
                onSuccess={(text) => appendNotices([{ level: 'success', text }])}
              />
            }
            onDownload={download}
          />
        ) : productionMode === 'set' ? (
          <PlanViewFigureSetPanel
            engine={engine}
            scenarios={scenarios}
            controller={figureSet}
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
          onGenerateFigure={generate}
        />
      }
    />
  )
}
