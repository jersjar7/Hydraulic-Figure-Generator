import { AlertCircle, Map } from 'lucide-react'
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
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { useMapElementController } from '../figures/useMapElementController'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { exportPlanViewResult } from './exportPlanViewResult'
import { PlanViewResultCanvas } from './PlanViewResultCanvas'
import type { PlanViewResultSettingsSectionKey } from './planViewResultDefinition'
import { planViewResultFigure } from './planViewResultFigure'
import { createDefaultPlanViewResultSettings } from './planViewResultSettings'
import { PlanViewResultSettingsPanel } from './PlanViewResultSettingsPanel'
import { PLAN_VIEW_RESULT_WORKSPACE_SETTINGS } from './planViewResultSettingsSections'
import { usePlanViewResultProjectFiles } from './usePlanViewResultProjectFiles'
import { usePlanViewResultRendering } from './usePlanViewResultRendering'

const SCENARIO_ROLES: readonly ScenarioRoleOption[] = [
  { role: 'baseline', label: 'Scenario', required: true },
]

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
      return engine.scalarResultOptions(baselineId, runIndex)
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

  const invalidate = useCallback(() => setScene(null), [])
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
    setBusy,
    appendNotices,
  })

  const updateSettings = <Key extends keyof PlanViewResultSettings>(
    key: Key,
    value: PlanViewResultSettings[Key],
  ) => setSettings((current) => ({ ...current, [key]: value }))

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
    setSettings(createDefaultPlanViewResultSettings())
    setScene(null)
    setNotices([])
    setLeftCollapsed(false)
    setActiveSection('result')
  }

  const download = () => {
    if (!scene) return
    void exportPlanViewResult({
      scene,
      engine,
      settings,
      overlays,
      appendNotices,
    })
  }

  return (
    <FigureWorkspaceScaffold<PlanViewResultSettingsSectionKey>
      figureLabel={planViewResultFigure.label}
      comparisonDescription={`${scenarioLabel} · ${selectedResult?.label ?? 'Select a result'}`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={busy}
      notices={notices}
      settingsSections={PLAN_VIEW_RESULT_WORKSPACE_SETTINGS}
      activeSettingsSection={activeSection}
      onSave={projectFiles.saveProject}
      onLoad={() => projectInputRef.current?.click()}
      onOpenLeftPanel={() => { setLeftCollapsed(false); setLeftOpen(true) }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => { setLeftOpen(false); setRightOpen(false) }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={setActiveSection}
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
          centerlineCandidates={[]}
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
        <PlanViewResultCanvas
          scene={scene}
          ready={ready}
          busy={busy}
          canvasRef={canvasRef}
          canvasFrameRef={canvasFrameRef}
          displaySize={displaySize}
          onGenerate={generate}
        />
      }
      settingsContent={
        <PlanViewResultSettingsPanel
          section={activeSection}
          settings={settings}
          resultOptions={resultOptions}
          activeElement={activeElement}
          elements={elements}
          canDownload={Boolean(scene)}
          onSettingsChange={updateSettings}
          onResultParameterChange={changeResult}
          onActiveElementChange={setActiveElement}
          onDownload={download}
        />
      }
      settingsFooter={
        <div className="generate-bar">
          <button
            className="button primary full"
            type="button"
            disabled={!ready || busy}
            data-testid="generate-plan-view"
            onClick={generate}
          >
            <Map size={18} aria-hidden="true" />
            {scene ? 'Regenerate map' : 'Generate map'}
          </button>
          {!ready ? (
            <span className="generate-hint">
              <AlertCircle size={14} aria-hidden="true" />
              Add one complete SMS scenario first
            </span>
          ) : null}
        </div>
      }
      figurePicker={<FigurePicker />}
    />
  )
}
