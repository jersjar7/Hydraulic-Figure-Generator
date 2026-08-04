import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import type { ScenarioRoleOption } from '../../components/project-data/projectWorkflowTypes'
import type {
  FigureElementPanelKey,
  IngestNotice,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { FigurePicker } from '../figures/FigurePicker'
import {
  FigureProductionModeSwitcher,
  type FigureProductionMode,
} from '../figure-sets/FigureProductionModeSwitcher'
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
import { usePlanViewResultProjectFiles } from './usePlanViewResultProjectFiles'
import { usePlanViewResultRendering } from './usePlanViewResultRendering'
import { usePlanViewFigureSet } from './usePlanViewFigureSet'
import { usePlanViewFigureDocument } from './usePlanViewFigureDocument'
import { PlanViewWorkspaceFooter } from './PlanViewWorkspaceFooter'
import { PlanViewWorkspaceMap } from './PlanViewWorkspaceMap'
import { usePlanViewStationing } from './usePlanViewStationing'

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
  const { overlays, setOverlays, loadDocument, resetDocument } = projectDocument
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
  const projectInputRef = useRef<HTMLInputElement>(null)
  const assessmentWorkflow = useAssessmentWorkflow(1)
  const displaySize = useFittedCanvasAspect(
    canvasFrameRef,
    settings.orientation === 'landscape' ? 1650 / 1275 : 1275 / 1650,
  )
  const resultOptions = useMemo(
    () => {
      void scenarios
      return engine.planViewResultOptions(baselineId, runIndex)
    }, [baselineId, engine, runIndex, scenarios],
  )
  const selectedResult = resultOptions.find(
    (option) => option.paramName === settings.resultParameter,
  )
  const ready = Boolean(selectedResult)
  const scenarioLabel = engine.condition(baselineId)?.label ?? 'Scenario'
  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length > 0) {
      setNotices((current) => [...current, ...incoming].slice(-40))
    }
  }, [])
  const elements = useMapElementController(settings, setSettings)
  const stationing = usePlanViewStationing({
    engine,
    scenarioId: baselineId,
    overlays,
    settings,
    setSettings,
    workflow: assessmentWorkflow,
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

  useEffect(() => {
    if (selectedResult || resultOptions.length === 0) return
    const next =
      resultOptions.find((option) => /Water_?Depth/i.test(option.paramName)) ??
      resultOptions[0]
    setSettings((current) => ({
      ...current,
      resultParameter: next.paramName,
      ramp: next.defaultRamp,
      legendMin: null,
      legendMax: null,
      scalarLegendInterval: null,
      elementStyles: {
        ...current.elementStyles,
        diffLegend: {
          ...current.elementStyles.diffLegend,
          title: next.label,
          units: next.units,
        },
      },
    }))
  }, [resultOptions, selectedResult])

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
    scene,
    engine,
    settings,
    overlays,
    centerlineStationing: stationing.layer,
    setBusy,
    appendNotices,
  })

  const updateSettings = <Key extends keyof PlanViewResultSettings>(
    key: Key,
    value: PlanViewResultSettings[Key],
  ) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    if (editingFigureSetItemId) {
      figureSet.updateItemSettings(editingFigureSetItemId, next)
    }
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

  const snapshot = {
    settings,
    scenarioSelection: {
      baselineId: projectSession.baselineId,
      comparisonId: projectSession.comparisonId,
      assessmentId: projectSession.assessmentId,
      runByScenario: projectSession.runByScenario,
      labels: Object.fromEntries(
        scenarios.map((scenario) => [scenario.key, scenario.label]),
      ),
    },
    project: projectDocument.document,
    figureSet: figureSet.figureSet,
    figureDocument: figureDocument.settings,
    stationingSource: {
      centerlineId: assessmentWorkflow.state.centerlineId,
      direction: assessmentWorkflow.state.direction,
      startStation: assessmentWorkflow.state.startStation,
    },
  }
  const projectFiles = usePlanViewResultProjectFiles({ snapshot, appendNotices })
  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const loaded = await projectFiles.loadProjectFile(file)
    if (!loaded) return
    setSettings(loaded.settings)
    loadDocument(loaded.project)
    projectSession.loadSelection(loaded.scenarioSelection)
    figureSet.load(loaded.figureSet ?? figureSet.figureSet)
    figureDocument.load(loaded.figureDocument)
    assessmentWorkflow.load(loaded.stationingSource ?? {}, 1)
    stationing.clearSelection()
    setScene(null)
    appendNotices([{
      level: 'success',
      text: 'Plan-view project loaded. Re-add the referenced local H5 files.',
    }])
  }

  const resetProject = () => {
    projectSession.reset()
    resetDocument()
    assessmentWorkflow.reset(1)
    stationing.clearSelection()
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
      centerlineStationing: stationing.layer,
      appendNotices,
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
          assessmentWorkflow={assessmentWorkflow}
          assessmentInterval={1}
          centerlineCandidates={stationing.candidates}
          stationedAssessmentLines={null}
          overlays={overlays}
          showOverlays={settings.showOverlays}
          projectInputs={projectInputs}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onAssessmentIntervalChange={() => undefined}
          onGenerateAssessmentLines={() => undefined}
          onShowOverlaysChange={(visible) => updateSettings('showOverlays', visible)}
          onReset={resetProject}
        />
      }
      mapContent={
        <PlanViewWorkspaceMap
          mode={productionMode}
          scene={scene}
          ready={ready}
          busy={busy}
          canvasRef={canvasRef}
          canvasFrameRef={canvasFrameRef}
          displaySize={displaySize}
          figureSet={figureSet}
          figureDocument={figureDocument}
          onGenerate={generate}
          onOpenFigure={openFigureSetItem}
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
            canDownload={Boolean(scene)}
            onSettingsChange={updateSettings}
            onResultParameterChange={changeResult}
            onActiveElementChange={setActiveElement}
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
      figurePicker={<FigurePicker />}
    />
  )
}
