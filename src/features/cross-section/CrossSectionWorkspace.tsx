import {
  LineChart,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import '../../App.css'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import { createDefaultFigureSettings } from '../../core/defaults'
import { formatStation } from '../../core/centerlineStationing'
import type {
  HydraulicCrossSectionScene,
  IngestNotice,
  WseAssessmentLine,
  WseDifferenceScene,
} from '../../core/types'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import { FigurePicker } from '../figures/FigurePicker'
import { useAssessmentMapLayers } from '../wse-difference/useAssessmentMapLayers'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import {
  type CrossSectionSettingsSectionKey,
} from './crossSectionDefinition'
import { crossSectionFigure } from './crossSectionFigure'
import { CrossSectionCanvas } from './CrossSectionCanvas'
import { CrossSectionSettingsPanel } from './CrossSectionSettingsPanel'
import {
  createDefaultCrossSectionSettings,
} from './crossSectionSettings'
import { useCrossSectionProjectFiles } from './useCrossSectionProjectFiles'
import { useCrossSectionRendering } from './useCrossSectionRendering'
import { useCrossSectionSelection } from './useCrossSectionSelection'
import { CROSS_SECTION_WORKSPACE_SETTINGS } from './crossSectionSettingsSections'
import { downloadCrossSectionPng } from './exportCrossSection'

export function CrossSectionWorkspace() {
  const { projectSession, projectDocument } = useHydraulicProjectWorkspace()
  const {
    engine,
    scenarios,
    baselineId,
    comparisonId,
    assessmentId,
    runByScenario,
  } = projectSession
  const { overlays, setOverlays } = projectDocument
  const [settings, setSettings] = useState(createDefaultCrossSectionSettings)
  const [mapSettings, setMapSettings] = useState(() => ({
    ...createDefaultFigureSettings(),
    showTitle: false,
    showLegend: false,
    showNorth: true,
    showScale: true,
    showWetDryKey: false,
    showAssessmentLabels: false,
  }))
  const [assessmentInterval, setAssessmentInterval] = useState(1)
  const assessmentWorkflow = useAssessmentWorkflow(assessmentInterval)
  const assessmentState = assessmentWorkflow.state
  const [mapScene, setMapScene] = useState<WseDifferenceScene | null>(null)
  const [chartScene, setChartScene] =
    useState<HydraulicCrossSectionScene | null>(null)
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<CrossSectionSettingsSectionKey>('section')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  const baselineRun = runByScenario[baselineId] ?? 0
  const comparisonRun = runByScenario[comparisonId] ?? 0
  const assessmentRun = runByScenario[assessmentId] ?? 0
  const ready = engine.isReady(baselineId, comparisonId)
  const baselineLabel = engine.condition(baselineId)?.label ?? 'Baseline'
  const comparisonLabel = engine.condition(comparisonId)?.label ?? 'Comparison'
  const assessmentCondition = engine.condition(assessmentId)
  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length > 0) {
      setNotices((current) => [...current, ...incoming].slice(-40))
    }
  }, [])
  const invalidateChart = useCallback(() => setChartScene(null), [])
  const invalidateFigures = useCallback(() => {
    setMapScene(null)
    setChartScene(null)
  }, [])
  const projectInputs = createHydraulicProjectInputActions({
    assessmentId,
    overlays,
    ingest: projectSession.ingest,
    removeCondition: projectSession.removeCondition,
    renameCondition: projectSession.renameCondition,
    changeRole: projectSession.changeRole,
    changeRun: projectSession.changeRun,
    setOverlays,
    onFilesChanged: () => {
      invalidateFigures()
      assessmentWorkflow.invalidate(assessmentInterval)
    },
    onSelectionChanged: invalidateFigures,
    onAssessmentSourceChanged: () =>
      assessmentWorkflow.clear(assessmentInterval),
    setBusy,
    appendNotices,
  })

  const assessmentLayers = useAssessmentMapLayers({
    modelWkt: assessmentCondition?.geometry?.wkt,
    overlays,
    state: assessmentState,
    stationing: mapSettings.centerlineStationing,
    selectedStationLabelId: null,
    setCenterline: assessmentWorkflow.setCenterline,
  })

  const assessmentOptions = useMemo(() => {
    if (!assessmentLayers.stationedAssessmentLines) {
      return assessmentState.collection.lines
    }
    const included = assessmentLayers.stationedAssessmentLines.items.filter(
      (item) => item.status === 'included',
    )
    return included.length > 0
      ? included.map((item) => item.line)
      : assessmentState.collection.lines
  }, [
    assessmentLayers.stationedAssessmentLines,
    assessmentState.collection.lines,
  ])

  const labelForAssessmentLine = useCallback(
    (line: WseAssessmentLine) => {
      const stationed = assessmentLayers.stationedAssessmentLines?.items.find(
        (item) => item.line.id === line.id,
      )
      return stationed?.selectedIntersection
        ? `Section ${formatStation(stationed.selectedIntersection.stationFeet)}`
        : `Existing WSE ${line.level.toFixed(2)} ft`
    },
    [assessmentLayers.stationedAssessmentLines],
  )
  const selection = useCrossSectionSelection({
    engine,
    baselineId,
    mapReady: Boolean(mapScene),
    mapSettings,
    assessmentLines: assessmentOptions,
    labelForAssessmentLine,
    onSectionNameChange: (sectionName) =>
      setSettings((current) => ({ ...current, sectionName })),
    onSelectionChanged: invalidateChart,
  })
  const {
    selectedLine,
    selectedAssessmentLineId,
    drawingStart,
    drawing,
    view,
  } = selection

  const buildSelectionMap = useCallback(() => {
    if (!ready) return
    try {
      setMapScene(
        wseDifferenceFigure.buildScene({
          engine,
          baselineId,
          baselineRun,
          comparisonId,
          comparisonRun,
          dryDepth: settings.dryDepth,
        }),
      )
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: error instanceof Error ? error.message : String(error),
        },
      ])
    }
  }, [
    appendNotices,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    engine,
    ready,
    settings.dryDepth,
  ])

  useEffect(() => {
    if (ready && !mapScene) buildSelectionMap()
  }, [buildSelectionMap, mapScene, ready])

  useCrossSectionRendering({
    canvasRef,
    view,
    chartScene,
    mapScene,
    engine,
    mapSettings,
    settings,
    overlays,
    assessmentLines: assessmentState.collection,
    selectedLine,
    setBusy,
    appendNotices,
  })

  const generateChart = () => {
    if (!selectedLine || !ready) return
    setBusy(true)
    try {
      const scene = crossSectionFigure.buildScene({
        engine,
        baselineId,
        baselineRun,
        comparisonId,
        comparisonRun,
        line: selectedLine,
        dryDepth: settings.dryDepth,
        sampleSpacing: settings.sampleSpacing,
      })
      setChartScene(scene)
      appendNotices(
        scene.warnings.map((text) => ({ level: 'warning' as const, text })),
      )
      selection.setView('chart')
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Cross section failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const generateAssessmentLines = () => {
    setBusy(true)
    try {
      const collection = engine.buildWseAssessmentLines(
        assessmentId,
        assessmentRun,
        settings.dryDepth,
        assessmentInterval,
      )
      assessmentWorkflow.setCollection(collection)
      appendNotices([
        {
          level: 'success',
          text: `Generated ${collection.lines.length} assessment-line path${collection.lines.length === 1 ? '' : 's'}.`,
        },
      ])
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

  const projectFiles = useCrossSectionProjectFiles({
    snapshot: {
      settings,
      selectedLine,
      selectedAssessmentLineId,
      scenarioSelection: {
        baselineId,
        comparisonId,
        assessmentId,
        runByScenario,
        labels: Object.fromEntries(
          scenarios.map((scenario) => [scenario.key, scenario.label]),
        ),
      },
      project: projectDocument.document,
    },
    appendNotices,
  })

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const payload = await projectFiles.loadProjectFile(file)
    if (!payload) return
    setSettings(payload.settings)
    selection.loadSelection(
      payload.selectedLine,
      payload.selectedAssessmentLineId,
    )
    projectSession.loadSelection(payload.scenarioSelection)
    projectDocument.loadDocument(payload.project)
    setMapScene(null)
    setChartScene(null)
    appendNotices([
      {
        level: 'success',
        text: 'Cross-section settings loaded. Re-add the H5 files to regenerate.',
      },
    ])
  }

  const downloadChart = () => {
    if (!chartScene) return
    downloadCrossSectionPng(chartScene, settings)
  }

  const resetProject = () => {
    projectSession.reset()
    projectDocument.resetDocument()
    assessmentWorkflow.reset(1)
    setSettings(createDefaultCrossSectionSettings())
    setMapSettings({
      ...createDefaultFigureSettings(),
      showTitle: false,
      showLegend: false,
      showNorth: true,
      showScale: true,
      showWetDryKey: false,
      showAssessmentLabels: false,
    })
    setAssessmentInterval(1)
    setMapScene(null)
    setChartScene(null)
    selection.loadSelection(null, '')
    setLeftCollapsed(false)
    setNotices([])
  }

  return (
    <FigureWorkspaceScaffold<CrossSectionSettingsSectionKey>
      figureLabel={crossSectionFigure.label}
      comparisonDescription={`${comparisonLabel} vs ${baselineLabel}`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={busy}
      notices={notices}
      settingsSections={CROSS_SECTION_WORKSPACE_SETTINGS}
      activeSettingsSection={activeSection}
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
      onSettingsSectionChange={setActiveSection}
      onZoomOut={() =>
        setMapSettings((current) => ({
          ...current,
          zoom: Math.max(0.35, current.zoom - 0.1),
        }))
      }
      onZoomIn={() =>
        setMapSettings((current) => ({
          ...current,
          zoom: Math.min(4, current.zoom + 0.1),
        }))
      }
      onFitFrame={() =>
        setMapSettings((current) => ({
          ...current,
          zoom: 1,
          panX: 0,
          panY: 0,
          rotation: 0,
        }))
      }
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
          inputCapabilities={crossSectionFigure.editor.inputs}
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          projectSession={projectSession}
          assessmentWorkflow={assessmentWorkflow}
          assessmentInterval={assessmentInterval}
          centerlineCandidates={assessmentLayers.centerlineCandidates}
          stationedAssessmentLines={assessmentLayers.stationedAssessmentLines}
          overlays={overlays}
          showOverlays={mapSettings.showOverlays}
          projectInputs={projectInputs}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onAssessmentIntervalChange={(interval) => {
            setAssessmentInterval(interval)
            assessmentWorkflow.clear(interval)
          }}
          onGenerateAssessmentLines={generateAssessmentLines}
          onShowOverlaysChange={(showOverlays) =>
            setMapSettings((current) => ({ ...current, showOverlays }))
          }
          onReset={resetProject}
        />
      }
      mapContent={
        <CrossSectionCanvas
          view={view}
          mapScene={mapScene}
          chartScene={chartScene}
          ready={ready}
          drawing={drawing}
          drawingStartSet={Boolean(drawingStart)}
          orientation={settings.orientation}
          canvasRef={canvasRef}
          onViewChange={selection.setView}
          onGenerateMap={buildSelectionMap}
          onPointerDown={selection.handleCanvasPointerDown}
        />
      }
      settingsContent={
        <CrossSectionSettingsPanel
          section={activeSection}
          settings={settings}
          assessmentLines={assessmentOptions}
          selectedAssessmentLineId={selectedAssessmentLineId}
          selectedLine={selectedLine}
          drawing={drawing}
          canDownload={Boolean(chartScene)}
          onSettingsChange={setSettings}
          onAssessmentLineChange={selection.chooseAssessmentLine}
          onStartDrawing={selection.startDrawing}
          onReverseLine={selection.reverseLine}
          onFlipViewSide={() => {
            setSettings((current) => ({
              ...current,
              downstreamSide:
                current.downstreamSide === 'right' ? 'left' : 'right',
            }))
            setChartScene(null)
          }}
          onClearLine={selection.clearSelectedLine}
          onShowMap={() => selection.setView('map')}
          onDownload={downloadChart}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<LineChart size={18} aria-hidden="true" />}
          label={chartScene ? 'Regenerate cross section' : 'Generate cross section'}
          disabled={!ready || !selectedLine || busy}
          testId="generate-cross-section"
          hint={!selectedLine ? 'Select or draw one cross-section line first' : undefined}
          onClick={generateChart}
        />
      }
      figurePicker={<FigurePicker />}
    />
  )
}
