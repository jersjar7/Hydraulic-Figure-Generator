import {
  AlertCircle,
  Download,
  FileJson,
  FolderOpen,
  Map,
  MapPin,
  PanelLeft,
  PanelRight,
  RefreshCcw,
  Save,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import '../../App.css'
import { ControlSection } from '../../components/ControlSection'
import { DiagnosticsWidget } from '../../components/DiagnosticsWidget'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
import { ProjectDataPanel } from '../../components/ProjectDataPanel'
import {
  DEFAULT_ELEMENT_STYLES,
  mergeElementStyles,
} from '../../core/figureElements'
import {
  findWseDifferenceExtrema,
  formatWseExtremumLabel,
  type WseDifferenceExtremum,
} from '../../core/hydraulicEngine'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  duplicateAnnotation,
  formatHydraulicResultLabel,
  FRAMES,
  hitTestAnnotation,
  hitTestAssessmentCallout,
  hitTestStationLabel,
  mapPointToCanvas,
  sampleHydraulicResult,
  stationLabelPosition,
} from '../../core/mapRenderer'
import {
  createHydraulicFigureProject,
  parseHydraulicFigureProject,
} from '../../core/projectFile'
import { readShapefileOverlays } from '../../core/shapefile'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useProjectSession } from '../project-session/useProjectSession'
import { downloadWseDifferencePng } from './exportWseDifference'
import { CalculationSettingsPanel } from './components/CalculationSettingsPanel'
import { AnnotationSettingsPanel } from './components/AnnotationSettingsPanel'
import { FrameSettingsPanel } from './components/FrameSettingsPanel'
import { LegendSettingsPanel } from './components/LegendSettingsPanel'
import { useAssessmentMapLayers } from './useAssessmentMapLayers'
import { wseDifferenceFigure } from './wseDifferenceFigure'
import type {
  AnnotationDefaults,
  AnnotationTool,
  ConditionKey,
  FigureElementPanelKey,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapCoordinate,
  MapElementKey,
  MapElementStyles,
  MapOverlay,
  ResultLabelField,
  ScenarioRole,
  StationLabelOverride,
  WseExtremumKind,
  WseDifferenceScene,
} from '../../core/types'
import {
  SETTINGS_SECTIONS,
  type AnnotationEditorView,
  type AnnotationPanelView,
  type AnnotationPlacedView,
  type SettingsSectionKey,
} from './workspaceConfiguration'
import { useFittedCanvasSize } from './useFittedCanvasSize'
import { useWseMapRendering } from './useWseMapRendering'
import { useWseFigureDocument } from './useWseFigureDocument'
import {
  annotationHasContentEditor,
  assessmentLineAt,
  defaultEditorView,
  defaultExtremumLabelPoint,
  draggedAnnotationPoints,
  updateDraggedResultAnnotation,
  type AnnotationDrag,
  type AssessmentCalloutDrag,
  type FigureElementDrag,
  type StationLabelDrag,
} from './workspaceInteractions'

const ACTIVE_FIGURE = wseDifferenceFigure

export function WseDifferenceWorkspace() {
  const projectSession = useProjectSession()
  const figureDocument = useWseFigureDocument()
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
    overlays,
    annotations,
    annotationDefaults,
    setSettings,
    setOverlays,
    setAnnotations,
    setAnnotationDefaults,
    resetDocument,
  } = figureDocument
  const assessmentWorkflow = useAssessmentWorkflow(1)
  const assessmentState = assessmentWorkflow.state
  const assessmentLines = assessmentState.collection
  const [annotationTool, setAnnotationTool] =
    useState<AnnotationTool>('select')
  const [annotationPanelView, setAnnotationPanelView] =
    useState<AnnotationPanelView>('create')
  const [annotationPlacedView, setAnnotationPlacedView] =
    useState<AnnotationPlacedView>('list')
  const [annotationEditorView, setAnnotationEditorView] =
    useState<AnnotationEditorView>('content')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  )
  const [annotationStart, setAnnotationStart] = useState<MapCoordinate | null>(
    null,
  )
  const [annotationDragging, setAnnotationDragging] = useState(false)
  const [assessmentCalloutDragging, setAssessmentCalloutDragging] =
    useState(false)
  const [stationLabelDragging, setStationLabelDragging] = useState(false)
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSectionKey>('calculation')
  const [activeElement, setActiveElement] =
    useState<FigureElementPanelKey>('title')
  const [selectedStationLabelId, setSelectedStationLabelId] =
    useState<string | null>(null)
  const [hoveredElement, setHoveredElement] =
    useState<MapElementKey | null>(null)
  const [elementDragging, setElementDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const canvasDisplaySize = useFittedCanvasSize(
    canvasFrameRef,
    settings.orientation,
  )
  const projectInputRef = useRef<HTMLInputElement>(null)
  const annotationDragRef = useRef<AnnotationDrag | null>(null)
  const assessmentCalloutDragRef = useRef<AssessmentCalloutDrag | null>(null)
  const stationLabelDragRef = useRef<StationLabelDrag | null>(null)
  const annotationListItemRefs = useRef(
    new globalThis.Map<string, HTMLButtonElement>(),
  )
  const figureElementDragRef = useRef<FigureElementDrag | null>(null)
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
  const resultLabelOptions: { value: ResultLabelField; label: string }[] = [
    { value: 'summary', label: 'WSE summary' },
    { value: 'difference', label: 'WSE difference' },
    { value: 'existingWse', label: `${baselineLabel} WSE` },
    { value: 'proposedWse', label: `${comparisonLabel} WSE` },
    { value: 'existingDepth', label: `${baselineLabel} depth` },
    { value: 'proposedDepth', label: `${comparisonLabel} depth` },
  ]
  const selectedAnnotation =
    annotations.find((annotation) => annotation.id === selectedAnnotationId) ??
    null
  const selectedAnnotationIndex = selectedAnnotation
    ? annotations.findIndex(
        (annotation) => annotation.id === selectedAnnotation.id,
      )
    : -1
  const annotationEditor = selectedAnnotation ?? annotationDefaults
  const activeResultField =
    selectedAnnotation?.kind === 'result'
      ? (selectedAnnotation.resultField ?? annotationDefaults.resultField)
      : annotationDefaults.resultField
  const wseExtrema = useMemo(
    () => (scene ? findWseDifferenceExtrema(scene) : null),
    [scene],
  )
  const extremaCalloutCount = annotations.filter(
    (annotation) => annotation.hydraulicExtremum,
  ).length
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

  useEffect(() => {
    if (
      selectedStationLabelId &&
      !centerlineStationTicks.some(
        (tick) => tick.id === selectedStationLabelId && tick.label,
      )
    ) {
      setSelectedStationLabelId(null)
    }
  }, [centerlineStationTicks, selectedStationLabelId])

  useEffect(() => {
    if (
      annotationPanelView === 'placed' &&
      annotationPlacedView === 'detail' &&
      !selectedAnnotation
    ) {
      setAnnotationPlacedView('list')
    }
  }, [annotationPanelView, annotationPlacedView, selectedAnnotation])

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    setNotices((current) => [...current, ...incoming].slice(-40))
  }, [])

  const updateSettings = <Key extends keyof FigureSettings>(
    key: Key,
    value: FigureSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const updateCenterlineStationing = (
    patch: Partial<FigureSettings['centerlineStationing']>,
  ) => {
    setSettings((current) => ({
      ...current,
      centerlineStationing: {
        ...current.centerlineStationing,
        ...patch,
      },
    }))
  }

  const updateStationLabelOverride = (
    id: string,
    override: StationLabelOverride | null,
  ) => {
    setSettings((current) => {
      const overrides = { ...current.centerlineStationing.overrides }
      if (override) overrides[id] = override
      else delete overrides[id]
      return {
        ...current,
        centerlineStationing: {
          ...current.centerlineStationing,
          overrides,
        },
      }
    })
  }

  const handleSettingsTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % SETTINGS_SECTIONS.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex =
        (index - 1 + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = SETTINGS_SECTIONS.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextSection = SETTINGS_SECTIONS[nextIndex]
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
      const incoming = await projectSession.ingest(
        files.filter((file) => /\.h5$/i.test(file.name)),
      )
      appendNotices(incoming)
    } finally {
      setBusy(false)
    }
  }

  const handleOverlayFiles = async (files: File[]) => {
    setBusy(true)
    try {
      const result = await readShapefileOverlays(
        files.filter((file) => /\.zip$/i.test(file.name)),
        overlays.length,
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

  useEffect(() => {
    if (!scene) return
    const bounds = engine.commonBounds()
    setAnnotations((current) =>
      current.map((annotation) => {
        if (annotation.kind !== 'result' || !annotation.resultField) {
          return annotation
        }
        const sample = sampleHydraulicResult(
          scene,
          bounds,
          settings,
          annotation.points[0],
        )
        return sample
          ? {
              ...annotation,
              text: formatHydraulicResultLabel(
                annotation.resultField,
                sample,
              ),
            }
          : annotation
      }),
    )
  }, [engine, scene, setAnnotations, settings])

  useEffect(() => {
    if (!wseExtrema) return
    const byKind = new globalThis.Map(
      [wseExtrema.rise, wseExtrema.reduction]
        .filter(
          (item): item is WseDifferenceExtremum => item !== null,
        )
        .map((extremum) => [extremum.kind, extremum]),
    )
    setAnnotations((current) =>
      current.flatMap((annotation) => {
        const kind = annotation.hydraulicExtremum
        if (!kind) return [annotation]
        const extremum = byKind.get(kind)
        if (!extremum) return []
        const previousTarget = annotation.points[0]
        const previousLabel = annotation.points[1]
        const labelPoint =
          previousTarget && previousLabel
            ? {
                x:
                  extremum.point.x +
                  previousLabel.x -
                  previousTarget.x,
                y:
                  extremum.point.y +
                  previousLabel.y -
                  previousTarget.y,
              }
            : extremum.point
        return [
          {
            ...annotation,
            points: [extremum.point, labelPoint],
            text: formatWseExtremumLabel(kind, extremum.value),
          },
        ]
      }),
    )
  }, [setAnnotations, wseExtrema])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      if (event.key === 'Escape') {
        setAnnotationStart(null)
        setAnnotationTool('select')
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedAnnotationId
      ) {
        setAnnotations((current) =>
          current.filter(
            (annotation) => annotation.id !== selectedAnnotationId,
          ),
        )
        setSelectedAnnotationId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotationId, setAnnotations])

  const createAnnotation = (
    kind: MapAnnotation['kind'],
    points: MapCoordinate[],
    text = annotationDefaults.text,
    resultField?: ResultLabelField,
  ) => {
    const id = globalThis.crypto.randomUUID()
    const annotation: MapAnnotation = {
      id,
      kind,
      points,
      text,
      color: annotationDefaults.color,
      fillColor: annotationDefaults.fillColor,
      lineWidth: annotationDefaults.lineWidth,
      fontSize: annotationDefaults.fontSize,
      rotation: annotationDefaults.rotation,
      dashed: annotationDefaults.dashed,
      background:
        kind === 'text'
          ? annotationDefaults.background
          : kind === 'leader' || kind === 'result'
            ? true
            : false,
      resultField,
    }
    setAnnotations((current) => [...current, annotation])
    setSelectedAnnotationId(id)
    setAnnotationTool('select')
    setAnnotationPanelView('placed')
    setAnnotationPlacedView('detail')
    setAnnotationEditorView(defaultEditorView(annotation))
    return annotation
  }

  const addWseExtremaCallouts = () => {
    if (!scene || !wseExtrema) return
    const extrema = [wseExtrema.rise, wseExtrema.reduction].filter(
      (item): item is WseDifferenceExtremum => item !== null,
    )
    if (extrema.length === 0) {
      appendNotices([
        {
          level: 'warning',
          text: 'No positive or negative WSE differences are available to label.',
        },
      ])
      return
    }

    const bounds = engine.commonBounds()
    const ids = new globalThis.Map<WseExtremumKind, string>()
    for (const extremum of extrema) {
      ids.set(
        extremum.kind,
        annotations.find(
          (annotation) =>
            annotation.hydraulicExtremum === extremum.kind,
        )?.id ?? globalThis.crypto.randomUUID(),
      )
    }

    setAnnotations((current) => {
      const extremaByKind = new globalThis.Map(
        extrema.map((extremum) => [extremum.kind, extremum]),
      )
      const seen = new Set<WseExtremumKind>()
      const next = current.flatMap((annotation) => {
        const kind = annotation.hydraulicExtremum
        if (!kind) return [annotation]
        const extremum = extremaByKind.get(kind)
        if (!extremum || seen.has(kind)) return []
        seen.add(kind)
        const previousTarget = annotation.points[0]
        const previousLabel = annotation.points[1]
        const labelPoint =
          previousTarget && previousLabel
            ? {
                x:
                  extremum.point.x +
                  previousLabel.x -
                  previousTarget.x,
                y:
                  extremum.point.y +
                  previousLabel.y -
                  previousTarget.y,
              }
            : defaultExtremumLabelPoint(extremum, bounds, settings)
        return [
          {
            ...annotation,
            kind: 'leader' as const,
            points: [extremum.point, labelPoint],
            text: formatWseExtremumLabel(kind, extremum.value),
            resultField: undefined,
          },
        ]
      })

      for (const extremum of extrema) {
        if (seen.has(extremum.kind)) continue
        next.push({
          id: ids.get(extremum.kind) ?? globalThis.crypto.randomUUID(),
          kind: 'leader',
          hydraulicExtremum: extremum.kind,
          points: [
            extremum.point,
            defaultExtremumLabelPoint(extremum, bounds, settings),
          ],
          text: formatWseExtremumLabel(extremum.kind, extremum.value),
          color:
            extremum.kind === 'max-rise' ? '#b42318' : '#175cd3',
          fillColor: annotationDefaults.fillColor,
          lineWidth: annotationDefaults.lineWidth,
          fontSize: annotationDefaults.fontSize,
          rotation: annotationDefaults.rotation,
          dashed: annotationDefaults.dashed,
          background: true,
        })
      }
      return next
    })

    setSelectedAnnotationId(ids.get(extrema[0].kind) ?? null)
    setAnnotationTool('select')
    setAnnotationPanelView('placed')
    setAnnotationPlacedView('detail')
    setAnnotationEditorView('content')
    setAnnotationStart(null)
    const summary = extrema
      .map((extremum) =>
        formatWseExtremumLabel(extremum.kind, extremum.value),
      )
      .join('; ')
    appendNotices([
      {
        level: 'success',
        text: `${extremaCalloutCount > 0 ? 'Refreshed' : 'Added'} ${summary}.`,
      },
      ...(extrema.length < 2
        ? [
            {
              level: 'warning' as const,
              text:
                wseExtrema.rise === null
                  ? 'No positive WSE rise was found in the comparison.'
                  : 'No negative WSE reduction was found in the comparison.',
            },
          ]
        : []),
    ])
  }

  const updateAnnotationAppearance = (
    patch: Partial<AnnotationDefaults>,
  ) => {
    if (selectedAnnotationId) {
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === selectedAnnotationId
            ? { ...annotation, ...patch }
            : annotation,
        ),
      )
    } else {
      setAnnotationDefaults((current) => ({ ...current, ...patch }))
    }
  }

  const setResultLabelField = (field: ResultLabelField) => {
    setAnnotationDefaults((current) => ({
      ...current,
      resultField: field,
    }))
    if (
      !selectedAnnotation ||
      selectedAnnotation.kind !== 'result' ||
      !scene
    ) {
      return
    }
    const sample = sampleHydraulicResult(
      scene,
      engine.commonBounds(),
      settings,
      selectedAnnotation.points[0],
    )
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === selectedAnnotation.id
          ? {
              ...annotation,
              resultField: field,
              text: sample
                ? formatHydraulicResultLabel(field, sample)
                : annotation.text,
            }
          : annotation,
      ),
    )
  }

  const pointerCanvasPoint = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) * canvas.width) / rect.width
    const y = ((event.clientY - rect.top) * canvas.height) / rect.height
    return {
      x: Math.max(0, Math.min(canvas.width, x)),
      y: Math.max(0, Math.min(canvas.height, y)),
    }
  }

  const figureElementAt = (point: { x: number; y: number }) =>
    [...elementBoundsRef.current]
      .reverse()
      .find(
        (bounds) =>
          point.x >= bounds.x - 6 &&
          point.x <= bounds.x + bounds.width + 6 &&
          point.y >= bounds.y - 6 &&
          point.y <= bounds.y + bounds.height + 6,
      )

  const moveFigureElementDrag = (point: { x: number; y: number }) => {
    const drag = figureElementDragRef.current
    if (!drag) return
    const frame = FRAMES[settings.orientation]
    const rawDx = point.x - drag.start.x
    const rawDy = point.y - drag.start.y
    const dx = Math.max(
      -drag.originalBounds.x,
      Math.min(
        frame.width -
          drag.originalBounds.x -
          drag.originalBounds.width,
        rawDx,
      ),
    )
    const dy = Math.max(
      -drag.originalBounds.y,
      Math.min(
        frame.height -
          drag.originalBounds.y -
          drag.originalBounds.height,
        rawDy,
      ),
    )
    updateElementPosition(drag.key, {
      offX: drag.originalPosition.offX + Math.round(dx),
      offY: drag.originalPosition.offY + Math.round(dy),
    })
  }

  const chooseAnnotationTool = (tool: AnnotationTool) => {
    setAnnotationPanelView('create')
    setAnnotationTool(tool)
    setAnnotationStart(null)
    if (tool !== 'select') setSelectedAnnotationId(null)
  }

  const chooseAnnotationPanelView = (view: AnnotationPanelView) => {
    setAnnotationPanelView(view)
    setAnnotationStart(null)
    if (view === 'create') {
      setSelectedAnnotationId(null)
      return
    }
    setAnnotationTool('select')
    setAnnotationPlacedView('list')
  }

  const handleAnnotationPanelTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationPanelView,
  ) => {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }
    event.preventDefault()
    const nextView =
      event.key === 'Home'
        ? 'create'
        : event.key === 'End'
          ? 'placed'
          : view === 'create'
            ? 'placed'
            : 'create'
    chooseAnnotationPanelView(nextView)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          `#annotation-view-tab-${nextView}`,
        )
        ?.focus(),
    )
  }

  const selectPlacedAnnotation = (annotation: MapAnnotation) => {
    setAnnotationPanelView('placed')
    setAnnotationPlacedView('detail')
    setAnnotationEditorView(defaultEditorView(annotation))
    setAnnotationTool('select')
    setAnnotationStart(null)
    setSelectedAnnotationId(annotation.id)
  }

  const returnToPlacedAnnotations = () => {
    setAnnotationPlacedView('list')
    setAnnotationStart(null)
    requestAnimationFrame(() => {
      if (selectedAnnotationId) {
        annotationListItemRefs.current.get(selectedAnnotationId)?.focus()
      }
    })
  }

  const selectAdjacentAnnotation = (direction: -1 | 1) => {
    if (annotations.length === 0) return
    const currentIndex = Math.max(0, selectedAnnotationIndex)
    const nextIndex =
      (currentIndex + direction + annotations.length) % annotations.length
    const next = annotations[nextIndex]
    setSelectedAnnotationId(next.id)
    if (
      annotationEditorView === 'content' &&
      !annotationHasContentEditor(next)
    ) {
      setAnnotationEditorView('style')
    }
  }

  const handleAnnotationEditorTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationEditorView,
  ) => {
    if (!selectedAnnotation) return
    const views: AnnotationEditorView[] = annotationHasContentEditor(
      selectedAnnotation,
    )
      ? ['content', 'style', 'position']
      : ['style', 'position']
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }
    event.preventDefault()
    const currentIndex = Math.max(0, views.indexOf(view))
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? views.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % views.length
            : (currentIndex - 1 + views.length) % views.length
    const nextView = views[nextIndex]
    setAnnotationEditorView(nextView)
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          `#annotation-editor-tab-${nextView}`,
        )
        ?.focus(),
    )
  }

  const handleAnnotationListKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(annotations.length - 1, index + 1)
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(0, index - 1)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = annotations.length - 1
    } else {
      return
    }
    event.preventDefault()
    const next = annotations[nextIndex]
    if (!next) return
    setSelectedAnnotationId(next.id)
    requestAnimationFrame(() =>
      annotationListItemRefs.current.get(next.id)?.focus(),
    )
  }

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!scene) return
    event.preventDefault()
    const screenPoint = pointerCanvasPoint(event)
    const bounds = engine.commonBounds()
    const mapPoint = canvasPointToMap(
      screenPoint.x,
      screenPoint.y,
      bounds,
      settings,
    )

    if (activeSettingsSection === 'elements') {
      const elementHit = figureElementAt(screenPoint)
      if (elementHit) {
        setActiveElement(elementHit.key)
        figureElementDragRef.current = {
          key: elementHit.key,
          start: screenPoint,
          originalPosition: {
            ...settings.elementPositions[elementHit.key],
          },
          originalBounds: { ...elementHit },
        }
        setElementDragging(true)
        setHoveredElement(elementHit.key)
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (annotationTool === 'select') {
      const stationHit = hitTestStationLabel(
        centerlineStationLayer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      if (stationHit) {
        const originalOverride =
          settings.centerlineStationing.overrides[stationHit.id]
        setActiveSettingsSection('elements')
        setActiveElement('stationing')
        setSelectedStationLabelId(stationHit.id)
        setRightOpen(true)
        stationLabelDragRef.current = {
          id: stationHit.id,
          startScreen: screenPoint,
          startPointer: mapPoint,
          originalRenderedPoint: stationHit.labelPoint,
          originalOverride: originalOverride
            ? { ...originalOverride }
            : undefined,
          moved: false,
        }
        setStationLabelDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (
      annotationTool === 'select' ||
      assessmentState.panelView === 'review'
    ) {
      const calloutHit = hitTestAssessmentCallout(
        assessmentDisplayLayer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      if (calloutHit) {
        const originalOverridePoint =
          assessmentState.overrides[calloutHit.lineId]?.labelPoint
        const stationedItem = stationedAssessmentLines?.items.find(
          (item) => item.line.id === calloutHit.lineId,
        )
        if (stationedItem) {
          assessmentWorkflow.setReviewTab(stationedItem.status)
        }
        assessmentWorkflow.selectLine(calloutHit.lineId)
        assessmentCalloutDragRef.current = {
          lineId: calloutHit.lineId,
          startScreen: screenPoint,
          startPointer: mapPoint,
          originalRenderedPoint: calloutHit.labelPoint,
          originalOverridePoint: originalOverridePoint
            ? { ...originalOverridePoint }
            : undefined,
          moved: false,
        }
        setAssessmentCalloutDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (
      assessmentState.panelView === 'review' &&
      stationedAssessmentLines
    ) {
      const line = assessmentLineAt(
        stationedAssessmentLines.items.map((item) => item.line),
        engine.commonBounds(),
        settings,
        screenPoint,
      )
      if (line) {
        const item = stationedAssessmentLines.items.find(
          (candidate) => candidate.line.id === line.id,
        )
        if (item) assessmentWorkflow.setReviewTab(item.status)
        assessmentWorkflow.selectLine(line.id)
        return
      }
    }

    if (annotationTool === 'extrema') return

    if (annotationTool === 'select') {
      const hit = hitTestAnnotation(
        annotations,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      setSelectedAnnotationId(hit?.id ?? null)
      if (hit) {
        const annotation = annotations.find((item) => item.id === hit.id)
        if (annotation) {
          setAnnotationPanelView('placed')
          setAnnotationPlacedView('detail')
          setAnnotationEditorView(defaultEditorView(annotation))
          if (annotation.hydraulicExtremum && hit.part !== 'body') {
            return
          }
          annotationDragRef.current = {
            id: hit.id,
            part: hit.part,
            start: mapPoint,
            end: mapPoint,
            originalPoints: annotation.points.map((point) => ({ ...point })),
          }
          setAnnotationDragging(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }
      return
    }

    if (annotationTool === 'text') {
      createAnnotation('text', [mapPoint])
      return
    }

    if (annotationTool === 'result') {
      const sample = sampleHydraulicResult(
        scene,
        bounds,
        settings,
        mapPoint,
      )
      if (!sample) {
        appendNotices([
          {
            level: 'warning',
            text: 'No hydraulic result was found close enough to that point.',
          },
        ])
        return
      }
      const frame = FRAMES[settings.orientation]
      const labelScreenPoint = {
        x: Math.min(frame.width - 40, screenPoint.x + 135),
        y: Math.max(40, screenPoint.y - 80),
      }
      const labelMapPoint = canvasPointToMap(
        labelScreenPoint.x,
        labelScreenPoint.y,
        bounds,
        settings,
      )
      createAnnotation(
        'result',
        [mapPoint, labelMapPoint],
        formatHydraulicResultLabel(annotationDefaults.resultField, sample),
        annotationDefaults.resultField,
      )
      return
    }

    if (!annotationStart) {
      setAnnotationStart(mapPoint)
      return
    }

    createAnnotation(annotationTool, [annotationStart, mapPoint])
    setAnnotationStart(null)
  }

  const moveAssessmentCalloutDrag = (screenPoint: {
    x: number
    y: number
  }) => {
    const drag = assessmentCalloutDragRef.current
    if (!drag) return
    if (
      !drag.moved &&
      Math.hypot(
        screenPoint.x - drag.startScreen.x,
        screenPoint.y - drag.startScreen.y,
      ) < 3
    ) {
      return
    }
    drag.moved = true
    const pointer = canvasPointToMap(
      screenPoint.x,
      screenPoint.y,
      engine.commonBounds(),
      settings,
    )
    assessmentWorkflow.setOverride(drag.lineId, {
      labelPoint: {
        x:
          drag.originalRenderedPoint.x +
          pointer.x -
          drag.startPointer.x,
        y:
          drag.originalRenderedPoint.y +
          pointer.y -
          drag.startPointer.y,
      },
    })
  }

  const moveStationLabelDrag = (screenPoint: {
    x: number
    y: number
  }) => {
    const drag = stationLabelDragRef.current
    if (!drag) return
    if (
      !drag.moved &&
      Math.hypot(
        screenPoint.x - drag.startScreen.x,
        screenPoint.y - drag.startScreen.y,
      ) < 3
    ) {
      return
    }
    drag.moved = true
    const pointer = canvasPointToMap(
      screenPoint.x,
      screenPoint.y,
      engine.commonBounds(),
      settings,
    )
    updateStationLabelOverride(drag.id, {
      ...drag.originalOverride,
      labelPoint: {
        x:
          drag.originalRenderedPoint.x +
          pointer.x -
          drag.startPointer.x,
        y:
          drag.originalRenderedPoint.y +
          pointer.y -
          drag.startPointer.y,
      },
    })
  }

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const screenPoint = pointerCanvasPoint(event)
    if (figureElementDragRef.current) {
      moveFigureElementDrag(screenPoint)
      return
    }
    if (stationLabelDragRef.current) {
      moveStationLabelDrag(pointerCanvasPoint(event))
      stationLabelDragRef.current = null
      setStationLabelDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    if (assessmentCalloutDragRef.current) {
      moveAssessmentCalloutDrag(screenPoint)
      return
    }
    if (stationLabelDragRef.current) {
      moveStationLabelDrag(screenPoint)
      return
    }
    if (activeSettingsSection === 'elements') {
      setHoveredElement(figureElementAt(screenPoint)?.key ?? null)
    } else if (hoveredElement) {
      setHoveredElement(null)
    }
    const drag = annotationDragRef.current
    if (!drag) return
    drag.end = canvasPointToMap(
      screenPoint.x,
      screenPoint.y,
      engine.commonBounds(),
      settings,
    )
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === drag.id
          ? {
              ...annotation,
              points: draggedAnnotationPoints(annotation, drag),
            }
          : annotation,
      ),
    )
  }

  const finishAnnotationDrag = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (figureElementDragRef.current) {
      moveFigureElementDrag(pointerCanvasPoint(event))
      figureElementDragRef.current = null
      setElementDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    if (assessmentCalloutDragRef.current) {
      moveAssessmentCalloutDrag(pointerCanvasPoint(event))
      const openSelectedReview =
        !assessmentCalloutDragRef.current.moved
      assessmentCalloutDragRef.current = null
      setAssessmentCalloutDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (openSelectedReview) {
        assessmentWorkflow.openReview()
        setLeftCollapsed(false)
        setLeftOpen(true)
      }
      return
    }
    const drag = annotationDragRef.current
    if (!drag) return
    const point = pointerCanvasPoint(event)
    drag.end = canvasPointToMap(
      point.x,
      point.y,
      engine.commonBounds(),
      settings,
    )
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === drag.id
          ? updateDraggedResultAnnotation(
              {
                ...annotation,
                points: draggedAnnotationPoints(annotation, drag),
              },
              drag.part,
              scene,
              engine,
              settings,
            )
          : annotation,
      ),
    )
    annotationDragRef.current = null
    setAnnotationDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const cancelAnnotationDrag = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const elementDrag = figureElementDragRef.current
    if (elementDrag) {
      updateElementPosition(elementDrag.key, elementDrag.originalPosition)
      figureElementDragRef.current = null
      setElementDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    const assessmentDrag = assessmentCalloutDragRef.current
    if (assessmentDrag) {
      assessmentWorkflow.setOverride(assessmentDrag.lineId, {
        labelPoint: assessmentDrag.originalOverridePoint,
      })
      assessmentCalloutDragRef.current = null
      setAssessmentCalloutDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    const stationDrag = stationLabelDragRef.current
    if (stationDrag) {
      updateStationLabelOverride(
        stationDrag.id,
        stationDrag.originalOverride ?? null,
      )
      stationLabelDragRef.current = null
      setStationLabelDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    const drag = annotationDragRef.current
    if (drag) {
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === drag.id
            ? {
                ...annotation,
                points: drag.originalPoints.map((point) => ({ ...point })),
              }
            : annotation,
        ),
      )
    }
    annotationDragRef.current = null
    setAnnotationDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const deleteSelectedAnnotation = () => {
    if (!selectedAnnotationId) return
    const selectedIndex = annotations.findIndex(
      (annotation) => annotation.id === selectedAnnotationId,
    )
    const nextSelection =
      annotations[selectedIndex + 1] ?? annotations[selectedIndex - 1] ?? null
    setAnnotations((current) =>
      current.filter(
        (annotation) => annotation.id !== selectedAnnotationId,
      ),
    )
    setSelectedAnnotationId(nextSelection?.id ?? null)
    if (!nextSelection) setAnnotationPlacedView('list')
  }

  const duplicateSelectedAnnotation = () => {
    if (!selectedAnnotation) return
    const frame = FRAMES[settings.orientation]
    const bounds = engine.commonBounds()
    const origin = canvasPointToMap(
      frame.width / 2,
      frame.height / 2,
      bounds,
      settings,
    )
    const shifted = canvasPointToMap(
      frame.width / 2 + 18,
      frame.height / 2 + 18,
      bounds,
      settings,
    )
    const id = globalThis.crypto.randomUUID()
    const copy = duplicateAnnotation(
      selectedAnnotation,
      id,
      shifted.x - origin.x,
      shifted.y - origin.y,
    )
    if (copy.kind === 'result' && copy.resultField && scene) {
      const sample = sampleHydraulicResult(
        scene,
        bounds,
        settings,
        copy.points[0],
      )
      if (sample) {
        copy.text = formatHydraulicResultLabel(copy.resultField, sample)
      }
    }
    setAnnotations((current) => [...current, copy])
    setSelectedAnnotationId(id)
    setAnnotationTool('select')
    setAnnotationPanelView('placed')
    setAnnotationPlacedView('detail')
    setAnnotationEditorView(defaultEditorView(copy))
    setAnnotationStart(null)
  }

  const nudgeSelectedAnnotation = (dx: number, dy: number) => {
    if (!selectedAnnotationId) return
    const frame = FRAMES[settings.orientation]
    const center = canvasPointToMap(
      frame.width / 2,
      frame.height / 2,
      engine.commonBounds(),
      settings,
    )
    const offset = canvasPointToMap(
      frame.width / 2 + dx,
      frame.height / 2 + dy,
      engine.commonBounds(),
      settings,
    )
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === selectedAnnotationId
          ? {
              ...annotation,
              points: annotation.points.map((point, index) =>
                annotation.hydraulicExtremum && index === 0
                  ? point
                  : {
                      x: point.x + offset.x - center.x,
                      y: point.y + offset.y - center.y,
                    },
              ),
            }
          : annotation,
      ),
    )
  }

  const updateOverlay = (id: string, patch: Partial<MapOverlay>) => {
    setOverlays((current) =>
      current.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
    )
  }

  const updateElementPosition = (
    key: MapElementKey,
    patch: Partial<FigureSettings['elementPositions'][MapElementKey]>,
  ) => {
    setSettings((current) => ({
      ...current,
      elementPositions: {
        ...current.elementPositions,
        [key]: { ...current.elementPositions[key], ...patch },
      },
    }))
  }

  const updateElementStyle = (
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ) => {
    setSettings((current) => ({
      ...current,
      elementStyles: {
        ...current.elementStyles,
        [key]: {
          ...current.elementStyles[key],
          ...patch,
        },
      } as MapElementStyles,
    }))
  }

  const updateElementVisibility = (
    key: MapElementKey,
    visible: boolean,
  ) => {
    const visibilityKey = {
      title: 'showTitle',
      diffLegend: 'showLegend',
      wetDry: 'showWetDryKey',
      north: 'showNorth',
      scale: 'showScale',
    } as const
    updateSettings(visibilityKey[key], visible)
  }

  const nudgeElement = (key: MapElementKey, dx: number, dy: number) => {
    const position = settings.elementPositions[key]
    updateElementPosition(key, {
      offX: position.offX + dx,
      offY: position.offY + dy,
    })
  }

  const resetElement = (key: MapElementKey) => {
    setSettings((current) => {
      const visibilityKey = {
        title: 'showTitle',
        diffLegend: 'showLegend',
        wetDry: 'showWetDryKey',
        north: 'showNorth',
        scale: 'showScale',
      } as const
      return {
        ...current,
        [visibilityKey[key]]: true,
        elementPositions: {
          ...current.elementPositions,
          [key]: { ...DEFAULT_ELEMENT_POSITIONS[key] },
        },
        elementStyles: {
          ...current.elementStyles,
          [key]: structuredClone(DEFAULT_ELEMENT_STYLES[key]),
        } as MapElementStyles,
      }
    })
  }

  const nudgeStationLabel = (dx: number, dy: number) => {
    if (!selectedStationLabelId || !centerlineStationLayer) return
    const currentPoint = stationLabelPosition(
      centerlineStationLayer,
      engine.commonBounds(),
      settings,
      selectedStationLabelId,
    )
    if (!currentPoint) return
    const screenPoint = mapPointToCanvas(
      currentPoint,
      engine.commonBounds(),
      settings,
    )
    const nextPoint = canvasPointToMap(
      screenPoint.x + dx,
      screenPoint.y + dy,
      engine.commonBounds(),
      settings,
    )
    updateStationLabelOverride(selectedStationLabelId, {
      ...settings.centerlineStationing.overrides[selectedStationLabelId],
      labelPoint: nextPoint,
    })
  }

  const resetCenterlineStationing = () => {
    const defaults =
      ACTIVE_FIGURE.createDefaultSettings().centerlineStationing
    setSettings((current) => ({
      ...current,
      centerlineStationing: structuredClone(defaults),
    }))
    setSelectedStationLabelId(null)
  }

  const resetView = () => {
    setSettings((current) => ({
      ...current,
      rotation: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
    }))
  }

  const resetProject = () => {
    projectSession.reset()
    resetDocument()
    setSelectedAnnotationId(null)
    setAnnotationStart(null)
    setAnnotationTool('select')
    setAnnotationPanelView('create')
    setAnnotationPlacedView('list')
    setAnnotationEditorView('content')
    setLeftCollapsed(false)
    assessmentCalloutDragRef.current = null
    setAssessmentCalloutDragging(false)
    stationLabelDragRef.current = null
    setStationLabelDragging(false)
    setSelectedStationLabelId(null)
    figureElementDragRef.current = null
    elementBoundsRef.current = []
    setElementDragging(false)
    setHoveredElement(null)
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
        scene,
        commonBounds: engine.commonBounds(),
        settings,
        overlays,
        assessment: assessmentExportLayer,
        annotations,
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
    const project = createHydraulicFigureProject({
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
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Hydraulic_Figure_Project.hydfig'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    try {
      const project = parseHydraulicFigureProject(await file.text())
      if (project.settings) {
        const {
          contourColor: legacyContourColor,
          showContours: legacyShowContours,
          ...projectSettings
        } = project.settings
        setSettings((current) => ({
          ...current,
          ...projectSettings,
          differenceOutlineColor:
            projectSettings.differenceOutlineColor ??
            legacyContourColor ??
            current.differenceOutlineColor,
          showDifferenceOutlines:
            projectSettings.showDifferenceOutlines ??
            legacyShowContours ??
            current.showDifferenceOutlines,
          showWetDryKey:
            projectSettings.showWetDryKey ?? current.showWetDryKey,
          centerlineStationing: {
            ...current.centerlineStationing,
            ...(projectSettings.centerlineStationing ?? {}),
            overrides: {
              ...(projectSettings.centerlineStationing?.overrides ?? {}),
            },
          },
          elementPositions: {
            ...current.elementPositions,
            ...(projectSettings.elementPositions ?? {}),
          },
          elementStyles: (() => {
            const merged = mergeElementStyles(
              current.elementStyles,
              projectSettings.elementStyles,
            )
            if (
              !projectSettings.elementStyles?.diffLegend &&
              typeof projectSettings.legendFontSize === 'number'
            ) {
              merged.diffLegend.fontSize = projectSettings.legendFontSize
            }
            if (
              !projectSettings.elementStyles?.wetDry &&
              typeof projectSettings.legendFontSize === 'number'
            ) {
              merged.wetDry.fontSize = Math.max(
                12,
                projectSettings.legendFontSize - 1,
              )
            }
            return merged
          })(),
        }))
      }
      if (Array.isArray(project.overlays)) setOverlays(project.overlays)
      if (Array.isArray(project.annotations)) {
        setAnnotations(project.annotations)
      }
      if (project.annotationDefaults) {
        setAnnotationDefaults((current) => ({
          ...current,
          ...project.annotationDefaults,
        }))
      }
      setSelectedAnnotationId(null)
      setSelectedStationLabelId(null)
      setAnnotationStart(null)
      setAnnotationPanelView('create')
      setAnnotationPlacedView('list')
      setAnnotationEditorView('content')
      setLeftCollapsed(false)
      const scenarioSelection = project.scenarioSelection
      projectSession.loadSelection({
        baselineId: scenarioSelection?.baselineId ?? 'EX',
        comparisonId: scenarioSelection?.comparisonId ?? 'PR',
        assessmentId: scenarioSelection?.assessmentId ?? 'EX',
        runByScenario: scenarioSelection?.runByScenario ?? {
          EX: project.selectedRuns?.existingRun ?? 0,
          PR: project.selectedRuns?.proposedRun ?? 0,
        },
        labels: scenarioSelection?.labels,
      })
      setScene(null)
      assessmentWorkflow.load(
        project.assessment ?? {},
        project.settings?.assessmentLineInterval ??
          settings.assessmentLineInterval,
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Map size={20} />
          </div>
          <div>
            <h1>Hydraulic Figure Generator</h1>
            <p>
              {ACTIVE_FIGURE.workspaceLabel} · {ACTIVE_FIGURE.label}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button secondary compact" type="button" onClick={saveProject}>
            <Save size={16} aria-hidden="true" />
            <span>Save</span>
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={() => projectInputRef.current?.click()}
          >
            <FolderOpen size={16} aria-hidden="true" />
            <span>Load</span>
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open project data"
            aria-label="Open project data"
            onClick={() => {
              setLeftCollapsed(false)
              setLeftOpen(true)
            }}
          >
            <PanelLeft size={19} />
          </button>
          <button
            className="icon-button mobile-panel-button"
            type="button"
            title="Open figure settings"
            aria-label="Open figure settings"
            onClick={() => setRightOpen(true)}
          >
            <PanelRight size={19} />
          </button>
          <input
            ref={projectInputRef}
            className="visually-hidden"
            type="file"
            accept=".hydfig,.json"
            onChange={loadProject}
          />
        </div>
      </header>

      <main
        className={`workspace${leftCollapsed ? ' inputs-collapsed' : ''}`}
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
              updateCenterlineStationing({ overrides: {} })
              setSelectedStationLabelId(null)
            },
            onDirectionChange: (direction) => {
              assessmentWorkflow.setDirection(direction)
              updateCenterlineStationing({ overrides: {} })
              setSelectedStationLabelId(null)
            },
            onStartStationChange: (station) => {
              assessmentWorkflow.setStartStation(station)
              updateCenterlineStationing({ overrides: {} })
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

        <section className="map-workspace">
          <div className="map-toolbar">
            <div className="map-mode">
              <span className="mode-dot" />
              <strong>{ACTIVE_FIGURE.label}</strong>
              <span>{comparisonLabel} minus {baselineLabel}</span>
            </div>
            <div className="map-toolbar-actions">
              <button
                className="icon-button"
                type="button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() =>
                  updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))
                }
              >
                <ZoomOut size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() =>
                  updateSettings('zoom', Math.min(4, settings.zoom + 0.1))
                }
              >
                <ZoomIn size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Fit map to frame"
                aria-label="Fit map to frame"
                onClick={resetView}
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="map-stage">
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
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={finishAnnotationDrag}
                onPointerCancel={cancelAnnotationDrag}
                onPointerLeave={() => {
                  if (!elementDragging) setHoveredElement(null)
                }}
                style={{
                  width: canvasDisplaySize.width || undefined,
                  height: canvasDisplaySize.height || undefined,
                }}
              />
            </div>
            {busy ? (
              <div className="map-busy" role="status">
                <span className="spinner" />
                Processing figure
              </div>
            ) : null}
            <DiagnosticsWidget notices={notices} />
          </div>
        </section>

        <aside className={`sidebar right-sidebar${rightOpen ? ' is-mobile-open' : ''}`}>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Output</span>
              <h2>Figure settings</h2>
            </div>
            <button
              className="icon-button mobile-close"
              type="button"
              title="Close figure settings"
              aria-label="Close figure settings"
              onClick={() => setRightOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <nav
            className="settings-switcher"
            aria-label="Figure settings sections"
            role="tablist"
          >
            {SETTINGS_SECTIONS.map((section, index) => {
              const Icon = section.icon
              const active = activeSettingsSection === section.key
              return (
                <button
                  className={`settings-tab${active ? ' active' : ''}`}
                  type="button"
                  role="tab"
                  id={`settings-tab-${section.key}`}
                  aria-controls={`settings-panel-${section.key}`}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  title={section.title}
                  key={section.key}
                  onClick={() => setActiveSettingsSection(section.key)}
                  onKeyDown={(event) =>
                    handleSettingsTabKeyDown(event, index)
                  }
                >
                  <Icon
                    className="settings-tab-icon"
                    size={18}
                    aria-hidden="true"
                  />
                  <span className="settings-tab-label">{section.label}</span>
                </button>
              )
            })}
          </nav>

          <div
            className="right-scroll"
            id={`settings-panel-${activeSettingsSection}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeSettingsSection}`}
          >
            {activeSettingsSection === 'calculation' ? (
              <CalculationSettingsPanel
                settings={settings}
                assessmentLabel={assessmentLabel}
                onSettingsChange={updateSettings}
                onDryDepthChange={(dryDepth) => {
                  updateSettings('dryDepth', dryDepth)
                  setScene(null)
                  assessmentWorkflow.clear(
                    settings.assessmentLineInterval,
                  )
                }}
              />
            ) : null}

            {activeSettingsSection === 'legend' ? (
              <LegendSettingsPanel
                settings={settings}
                onSettingsChange={updateSettings}
              />
            ) : null}

            {activeSettingsSection === 'frame' ? (
              <FrameSettingsPanel
                settings={settings}
                onSettingsChange={updateSettings}
                onResetView={resetView}
              />
            ) : null}

            {activeSettingsSection === 'elements' ? (
            <ControlSection>
              <FigureElementsPanel
                settings={settings}
                activeElement={activeElement}
                onActiveElementChange={setActiveElement}
                onVisibilityChange={updateElementVisibility}
                onTitleTemplateChange={(value) =>
                  updateSettings('titleTemplate', value)
                }
                onStyleChange={updateElementStyle}
                onPositionChange={updateElementPosition}
                onNudge={nudgeElement}
                onResetElement={resetElement}
                stationTicks={centerlineStationTicks}
                selectedStationLabelId={selectedStationLabelId}
                hasCenterline={Boolean(selectedCenterline)}
                onStationingChange={updateCenterlineStationing}
                onStationLabelSelect={setSelectedStationLabelId}
                onStationLabelOverrideChange={
                  updateStationLabelOverride
                }
                onNudgeStationLabel={nudgeStationLabel}
                onResetStationing={resetCenterlineStationing}
              />
            </ControlSection>
            ) : null}

            {activeSettingsSection === 'annotations' ? (
              <AnnotationSettingsPanel
                model={{
                  annotations,
                  panelView: annotationPanelView,
                  placedView: annotationPlacedView,
                  editorView: annotationEditorView,
                  tool: annotationTool,
                  drawing: Boolean(annotationStart),
                  sceneReady: Boolean(scene),
                  extrema: wseExtrema,
                  extremaCalloutCount,
                  baselineLabel,
                  comparisonLabel,
                  editor: annotationEditor,
                  activeResultField,
                  resultLabelOptions,
                  selectedId: selectedAnnotationId,
                  selected: selectedAnnotation,
                  selectedIndex: selectedAnnotationIndex,
                  listItemRefs: annotationListItemRefs,
                }}
                actions={{
                  choosePanelView: chooseAnnotationPanelView,
                  handlePanelTabKeyDown: handleAnnotationPanelTabKeyDown,
                  chooseTool: chooseAnnotationTool,
                  cancelDrawing: () => setAnnotationStart(null),
                  addExtremaCallouts: addWseExtremaCallouts,
                  updateAppearance: updateAnnotationAppearance,
                  setResultField: setResultLabelField,
                  selectPlaced: selectPlacedAnnotation,
                  handleListKeyDown: handleAnnotationListKeyDown,
                  clearAnnotations: () => {
                    setAnnotations([])
                    setSelectedAnnotationId(null)
                    setAnnotationStart(null)
                  },
                  returnToList: returnToPlacedAnnotations,
                  selectAdjacent: selectAdjacentAnnotation,
                  setEditorView: setAnnotationEditorView,
                  handleEditorTabKeyDown: handleAnnotationEditorTabKeyDown,
                  nudgeSelected: nudgeSelectedAnnotation,
                  duplicateSelected: duplicateSelectedAnnotation,
                  deleteSelected: deleteSelectedAnnotation,
                }}
              />
            ) : null}
            {activeSettingsSection === 'export' ? (
            <ControlSection>
              <div className="export-note">
                <FileJson size={17} aria-hidden="true" />
                <span>
                  Project files retain figure settings, overlays, and
                  annotations. H5 files remain local and must be re-added.
                </span>
              </div>
              <button
                className="button secondary full"
                type="button"
                disabled={!scene}
                onClick={downloadMap}
              >
                <Download size={17} aria-hidden="true" />
                Download map PNG
              </button>
            </ControlSection>
            ) : null}
          </div>

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
        </aside>
      </main>

      {(leftOpen || rightOpen) && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close side panel"
          onClick={() => {
            setLeftOpen(false)
            setRightOpen(false)
          }}
        />
      )}
    </div>
  )
}
