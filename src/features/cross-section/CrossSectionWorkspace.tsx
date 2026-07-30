import {
  ImageDown,
  LineChart,
  Palette,
  Ruler,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react'
import '../../App.css'
import { importHydraulicFiles } from '../../application/importHydraulicFiles'
import { importOverlayArchives } from '../../application/importOverlayArchives'
import { ProjectDataPanel } from '../../components/ProjectDataPanel'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { createDefaultFigureSettings } from '../../core/defaults'
import { formatStation } from '../../core/centerlineStationing'
import {
  canvasPointToMap,
  createWseDifferenceRenderDocument,
  mapPointToCanvas,
} from '../../core/mapRenderer'
import type {
  CrossSectionLine,
  HydraulicCrossSectionScene,
  IngestNotice,
  WseAssessmentLine,
  WseDifferenceScene,
} from '../../core/types'
import { shapefileArchivePort } from '../../infrastructure/shapefiles/shapefileArchivePort'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useHydraulicProjectWorkspace } from '../project-workspace/HydraulicProjectWorkspaceProvider'
import { FigurePicker } from '../figures/FigurePicker'
import { useAssessmentMapLayers } from '../wse-difference/useAssessmentMapLayers'
import { wseDifferenceFigure } from '../wse-difference/wseDifferenceFigure'
import {
  CROSS_SECTION_SETTINGS_SECTIONS,
  type CrossSectionSettingsSectionKey,
} from './crossSectionDefinition'
import { crossSectionFigure } from './crossSectionFigure'
import { CrossSectionCanvas } from './CrossSectionCanvas'
import {
  renderCrossSectionDocument,
} from './crossSectionRenderer'
import { CrossSectionSettingsPanel } from './CrossSectionSettingsPanel'
import {
  createDefaultCrossSectionSettings,
  type CrossSectionFigureSettings,
} from './crossSectionSettings'

const SETTINGS_SECTIONS = [
  { ...CROSS_SECTION_SETTINGS_SECTIONS[0], icon: Ruler },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[1], icon: LineChart },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[2], icon: Palette },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[3], icon: ImageDown },
] as const

function lineDistanceToPoint(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length2 = dx * dx + dy * dy
  const fraction =
    length2 > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / length2,
          ),
        )
      : 0
  return Math.hypot(
    point.x - (start.x + dx * fraction),
    point.y - (start.y + dy * fraction),
  )
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}

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
  const [selectedLine, setSelectedLine] = useState<CrossSectionLine | null>(null)
  const [selectedAssessmentLineId, setSelectedAssessmentLineId] = useState('')
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [view, setView] = useState<'map' | 'chart'>('map')
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

  const chooseAssessmentLine = useCallback(
    (id: string) => {
      setSelectedAssessmentLineId(id)
      const line = assessmentOptions.find((candidate) => candidate.id === id)
      if (!line) {
        setSelectedLine(null)
        return
      }
      const label = labelForAssessmentLine(line)
      setSelectedLine({
        id: line.id,
        label,
        stationLabel: label.startsWith('Section ') ? label.slice(8) : undefined,
        points: line.points,
        direction: 'a-to-b',
      })
      setSettings((current) => ({ ...current, sectionName: label }))
      setDrawing(false)
      setDrawingStart(null)
      setChartScene(null)
    },
    [assessmentOptions, labelForAssessmentLine],
  )

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (view === 'chart' && chartScene) {
      renderCrossSectionDocument(canvas, { scene: chartScene, settings })
      return
    }
    if (view !== 'map' || !mapScene) return
    const selectedAssessment =
      assessmentState.collection.lines.find(
        (line) => line.id === selectedAssessmentLineId,
      ) ?? null
    const manualLine =
      selectedLine && !selectedAssessment
        ? {
            id: selectedLine.id,
            source: 'manual-cross-section',
            level: Number.NaN,
            points: selectedLine.points,
            modelPoints: [],
            lengthFeet: 0,
          }
        : null
    const controller = new AbortController()
    setBusy(true)
    void wseDifferenceFigure
      .render({
        canvas,
        document: createWseDifferenceRenderDocument({
          scene: mapScene,
          commonBounds: engine.commonBounds(),
          settings: mapSettings,
          overlays,
          assessment: {
            lines: assessmentState.collection.lines,
            selectedLine: selectedAssessment ?? manualLine,
          },
        }),
        signal: controller.signal,
      })
      .catch((error) =>
        appendNotices([
          {
            level: 'error',
            text: `Selection map failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ]),
      )
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [
    appendNotices,
    assessmentState.collection.lines,
    chartScene,
    engine,
    mapScene,
    mapSettings,
    overlays,
    selectedAssessmentLineId,
    selectedLine,
    settings,
    view,
  ])

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
      setView('chart')
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

  const handleCanvasPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!mapScene) return
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const canvasPoint = {
      x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    }
    if (drawing) {
      const mapPoint = canvasPointToMap(
        canvasPoint.x,
        canvasPoint.y,
        engine.commonBounds(),
        mapSettings,
      )
      if (!drawingStart) {
        setDrawingStart(mapPoint)
        return
      }
      const label = `Manual Section ${Date.now().toString().slice(-4)}`
      setSelectedLine({
        id: `manual-${Date.now()}`,
        label,
        points: [drawingStart, mapPoint],
        direction: 'a-to-b',
      })
      setSettings((current) => ({ ...current, sectionName: label }))
      setSelectedAssessmentLineId('')
      setDrawing(false)
      setDrawingStart(null)
      setChartScene(null)
      return
    }

    let closest: { id: string; distance: number } | null = null
    for (const line of assessmentOptions) {
      for (let index = 1; index < line.points.length; index += 1) {
        const start = mapPointToCanvas(
          line.points[index - 1],
          engine.commonBounds(),
          mapSettings,
        )
        const end = mapPointToCanvas(
          line.points[index],
          engine.commonBounds(),
          mapSettings,
        )
        const distance = lineDistanceToPoint(canvasPoint, start, end)
        if (!closest || distance < closest.distance) {
          closest = { id: line.id, distance }
        }
      }
    }
    if (closest && closest.distance <= 14) chooseAssessmentLine(closest.id)
  }

  const handleH5Files = async (files: File[]) => {
    setBusy(true)
    setMapScene(null)
    setChartScene(null)
    try {
      appendNotices(
        await importHydraulicFiles(files, { ingest: projectSession.ingest }),
      )
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

  const saveProject = () => {
    const payload = {
      version: 1,
      figureId: crossSectionFigure.id,
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
    }
    const link = document.createElement('a')
    link.download = 'FRA_Cross_Section.hydfig'
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      }),
    )
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const payload = JSON.parse(await file.text()) as {
        figureId?: string
        settings?: CrossSectionFigureSettings
        selectedLine?: CrossSectionLine | null
        selectedAssessmentLineId?: string
        scenarioSelection?: Parameters<typeof projectSession.loadSelection>[0]
        project?: Parameters<typeof projectDocument.loadDocument>[0]
      }
      if (payload.figureId !== crossSectionFigure.id || !payload.settings) {
        throw new Error('This is not a Cross-Section Comparison project file.')
      }
      setSettings(payload.settings)
      setSelectedLine(payload.selectedLine ?? null)
      setSelectedAssessmentLineId(payload.selectedAssessmentLineId ?? '')
      if (payload.scenarioSelection) {
        projectSession.loadSelection(payload.scenarioSelection)
      }
      if (payload.project) projectDocument.loadDocument(payload.project)
      setMapScene(null)
      setChartScene(null)
      appendNotices([
        {
          level: 'success',
          text: 'Cross-section settings loaded. Re-add the H5 files to regenerate.',
        },
      ])
    } catch (error) {
      appendNotices([
        {
          level: 'error',
          text: `Project load failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    }
  }

  const downloadChart = () => {
    if (!chartScene) return
    const canvas = document.createElement('canvas')
    renderCrossSectionDocument(canvas, { scene: chartScene, settings })
    downloadCanvas(canvas, crossSectionFigure.exportFileName(chartScene))
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
    setSelectedLine(null)
    setSelectedAssessmentLineId('')
    setDrawing(false)
    setDrawingStart(null)
    setLeftCollapsed(false)
    setNotices([])
    setView('map')
  }

  return (
    <FigureWorkspaceScaffold<CrossSectionSettingsSectionKey>
      workspaceLabel={crossSectionFigure.workspaceLabel}
      figureLabel={crossSectionFigure.label}
      comparisonDescription={`${comparisonLabel} vs ${baselineLabel}`}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={busy}
      notices={notices}
      settingsSections={SETTINGS_SECTIONS}
      activeSettingsSection={activeSection}
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
        <ProjectDataPanel
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          busy={busy}
          scenarios={scenarios}
          baselineId={baselineId}
          comparisonId={comparisonId}
          assessmentId={assessmentId}
          runByScenario={runByScenario}
          assessmentLines={assessmentState.collection}
          assessmentReview={{
            view: assessmentState.panelView,
            candidates: assessmentLayers.centerlineCandidates,
            centerlineId: assessmentState.centerlineId,
            direction: assessmentState.direction,
            startStation: assessmentState.startStation,
            reviewTab: assessmentState.reviewTab,
            selectedLineId: assessmentState.selectedLineId,
            overrides: assessmentState.overrides,
            stationed: assessmentLayers.stationedAssessmentLines,
            onOpen: assessmentWorkflow.openReview,
            onBack: assessmentWorkflow.closeReview,
            onCenterlineChange: assessmentWorkflow.setCenterline,
            onDirectionChange: assessmentWorkflow.setDirection,
            onStartStationChange: assessmentWorkflow.setStartStation,
            onReviewTabChange: assessmentWorkflow.setReviewTab,
            onSelectLine: assessmentWorkflow.selectLine,
            onSetOverride: assessmentWorkflow.setOverride,
          }}
          overlays={overlays}
          showOverlays={mapSettings.showOverlays}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onH5Files={handleH5Files}
          onOverlayFiles={handleOverlayFiles}
          onRemoveCondition={(key) => {
            projectSession.removeCondition(key)
            setMapScene(null)
            setChartScene(null)
          }}
          onRenameCondition={projectSession.renameCondition}
          onRoleChange={(role, key) => {
            projectSession.changeRole(role, key)
            setMapScene(null)
            setChartScene(null)
          }}
          onRunChange={(key, index) => {
            projectSession.changeRun(key, index)
            setMapScene(null)
            setChartScene(null)
          }}
          runsFor={(key) => engine.runOptions(key)}
          onAssessmentIntervalChange={(interval) => {
            setAssessmentInterval(interval)
            assessmentWorkflow.clear(interval)
          }}
          onGenerateAssessmentLines={generateAssessmentLines}
          onClearAssessmentLines={() => assessmentWorkflow.clear(assessmentInterval)}
          onShowOverlaysChange={(showOverlays) =>
            setMapSettings((current) => ({ ...current, showOverlays }))
          }
          onUpdateOverlay={(id, patch) =>
            setOverlays((current) =>
              current.map((overlay) =>
                overlay.id === id ? { ...overlay, ...patch } : overlay,
              ),
            )
          }
          onRemoveOverlay={(id) =>
            setOverlays((current) =>
              current.filter((overlay) => overlay.id !== id),
            )
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
          canvasRef={canvasRef}
          onViewChange={setView}
          onGenerateMap={buildSelectionMap}
          onPointerDown={handleCanvasPointerDown}
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
          canGenerate={ready && Boolean(selectedLine)}
          canDownload={Boolean(chartScene)}
          onSettingsChange={setSettings}
          onAssessmentLineChange={chooseAssessmentLine}
          onStartDrawing={() => {
            setView('map')
            setDrawing(true)
            setDrawingStart(null)
            setSelectedAssessmentLineId('')
          }}
          onReverseLine={() => {
            setSelectedLine((current) =>
              current
                ? {
                    ...current,
                    direction:
                      current.direction === 'a-to-b' ? 'b-to-a' : 'a-to-b',
                  }
                : null,
            )
            setChartScene(null)
          }}
          onShowMap={() => setView('map')}
          onGenerate={generateChart}
          onDownload={downloadChart}
        />
      }
      settingsFooter={
        <div className="generate-bar">
          <button
            className="button primary full"
            type="button"
            disabled={!ready || !selectedLine || busy}
            data-testid="generate-cross-section"
            onClick={generateChart}
          >
            <LineChart size={18} aria-hidden="true" />
            {chartScene ? 'Regenerate cross section' : 'Generate cross section'}
          </button>
        </div>
      }
      figurePicker={<FigurePicker />}
    />
  )
}
