import { LineChart } from 'lucide-react'
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import '../../App.css'
import { HydraulicProjectPanel } from '../../components/project-data/HydraulicProjectPanel'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import { createDefaultFigureSettings } from '../../core/defaults'
import { formatStation } from '../../core/centerlineStationing'
import type { IngestNotice, WseAssessmentLine } from '../../core/types'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { createHydraulicProjectInputActions } from '../project-workspace/hydraulicProjectInputActions'
import { useAssessmentMapLayers } from '../wse-difference/useAssessmentMapLayers'
import { type CrossSectionSettingsSectionKey } from './crossSectionDefinition'
import { crossSectionFigure } from './crossSectionFigure'
import { createCrossSectionReportFigure } from './crossSectionReportAdapter'
import { CrossSectionCanvas } from './CrossSectionCanvas'
import { CrossSectionSettingsPanel } from './CrossSectionSettingsPanel'
import { createDefaultCrossSectionSettings } from './crossSectionSettings'
import { useCrossSectionGeneration } from './useCrossSectionGeneration'
import { useCrossSectionRendering } from './useCrossSectionRendering'
import { useCrossSectionSelection } from './useCrossSectionSelection'
import { CROSS_SECTION_WORKSPACE_SETTINGS } from './crossSectionSettingsSections'
import { downloadCrossSectionPng } from './exportCrossSection'
import { useCrossSectionDraftRetention } from './useCrossSectionDraftRetention'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'

export function CrossSectionWorkspace() {
  const {
    projectSession,
    projectDocument,
    projectCommands,
  } = useHydraulicProjectWorkspace()
  const {
    engine,
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
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSection, setActiveSection] =
    useState<CrossSectionSettingsSectionKey>('section')
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    mapReady: ready,
    mapSettings,
    assessmentLines: assessmentOptions,
    labelForAssessmentLine,
    onSectionNameChange: (sectionName) =>
      setSettings((current) => ({ ...current, sectionName })),
  })
  const {
    selectedLine,
    selectedAssessmentLineId,
    drawingStart,
    drawing,
    view,
  } = selection

  const generation = useCrossSectionGeneration({
    engine,
    baselineId,
    baselineRun,
    comparisonId,
    comparisonRun,
    assessmentId,
    assessmentRun,
    assessmentInterval,
    ready,
    selectedLine,
    settings,
    assessmentWorkflow,
    setBusy,
    appendNotices,
    showChart: () => selection.setView('chart'),
  })
  const { mapScene, chartScene } = generation

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
      generation.invalidateFigures()
      assessmentWorkflow.invalidate(assessmentInterval)
    },
    onSelectionChanged: generation.invalidateFigures,
    onAssessmentSourceChanged: () =>
      assessmentWorkflow.clear(assessmentInterval),
    setBusy,
    appendNotices,
  })

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

  const workspaceDraft = useCrossSectionDraftRetention({
    settings,
    selectedLine,
    selectedAssessmentLineId,
    projectSession,
    projectDocument,
    setSettings,
    loadSelection: selection.loadSelection,
    invalidateFigures: generation.invalidateFigures,
  })
  const downloadChart = () => {
    if (!chartScene) return
    downloadCrossSectionPng(chartScene, settings)
  }

  const createExportFigure = () => {
    if (!chartScene || !canvasRef.current) return null
    return createCrossSectionReportFigure(
      canvasRef.current,
      chartScene,
      baselineLabel,
      comparisonLabel,
      workspaceDraft.capture(),
    )
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
    generation.invalidateFigures()
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
          onGenerateAssessmentLines={generation.generateAssessmentLines}
          onShowOverlaysChange={(showOverlays) =>
            setMapSettings((current) => ({ ...current, showOverlays }))
          }
          onReset={() => projectCommands.confirmWorkspaceReset(resetProject)}
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
          draggingEndpoint={selection.draggingEndpoint}
          orientation={settings.orientation}
          canvasRef={canvasRef}
          onViewChange={selection.setView}
          onGenerateMap={generation.generateSelectionMap}
          onPointerDown={selection.handleCanvasPointerDown}
          onPointerMove={selection.handleCanvasPointerMove}
          onPointerUp={selection.handleCanvasPointerUp}
          onPointerCancel={selection.handleCanvasPointerCancel}
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
            generation.invalidateChart()
          }}
          onClearLine={selection.clearSelectedLine}
          onShowMap={() => selection.setView('map')}
          exportActions={
            <ReportFigureExportActions
              workspaceId={crossSectionFigure.id}
              canExport={Boolean(chartScene && canvasRef.current)}
              createFigure={createExportFigure}
              onSuccess={(text) => appendNotices([{ level: 'success', text }])}
            />
          }
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
          onClick={generation.generateChart}
        />
      }
    />
  )
}
