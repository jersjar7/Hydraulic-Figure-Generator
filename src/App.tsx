import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  ArrowUpDown,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  ImageDown,
  List,
  Map,
  MapPin,
  MessageSquareText,
  Minus,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Type,
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
import './App.css'
import { ControlSection } from './components/ControlSection'
import { DiagnosticsWidget } from './components/DiagnosticsWidget'
import { FigureElementsPanel } from './components/FigureElementsPanel'
import { ProjectDataPanel } from './components/ProjectDataPanel'
import {
  createDefaultAnnotationSettings,
  createDefaultFigureSettings,
} from './core/defaults'
import {
  extractCenterlineCandidates,
  stationAssessmentLines,
} from './core/centerlineStationing'
import {
  DEFAULT_ELEMENT_STYLES,
  mergeElementStyles,
} from './core/figureElements'
import {
  findWseDifferenceExtrema,
  formatWseExtremumLabel,
  HydraulicEngine,
  runDisplayName,
  type WseDifferenceExtremum,
} from './core/hydraulicEngine'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  duplicateAnnotation,
  formatHydraulicResultLabel,
  FRAMES,
  hitTestAnnotation,
  hitTestAssessmentCallout,
  mapPointToCanvas,
  moveAnnotationPoints,
  renderWseDifferenceMap,
  sampleHydraulicResult,
  type AnnotationHitPart,
} from './core/mapRenderer'
import {
  createHydraulicFigureProject,
  parseHydraulicFigureProject,
} from './core/projectFile'
import { readShapefileOverlays } from './core/shapefile'
import { useAssessmentWorkflow } from './features/assessment-lines/useAssessmentWorkflow'
import type {
  AnnotationDefaults,
  AssessmentMapLayer,
  AnnotationTool,
  Bounds,
  ConditionKey,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapCoordinate,
  MapElementBounds,
  MapElementKey,
  MapElementStyles,
  MapOverlay,
  ResultLabelField,
  WseAssessmentLine,
  WseExtremumKind,
  WseDifferenceScene,
} from './core/types'

const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

const SETTINGS_SECTIONS = [
  {
    key: 'calculation',
    label: 'Map',
    title: 'Map calculation',
    icon: Settings2,
  },
  {
    key: 'legend',
    label: 'Legend',
    title: 'Legend and colors',
    icon: Palette,
  },
  {
    key: 'frame',
    label: 'View',
    title: 'Frame and view',
    icon: SlidersHorizontal,
  },
  {
    key: 'elements',
    label: 'Elements',
    title: 'Figure elements',
    icon: MapPin,
  },
  {
    key: 'annotations',
    label: 'Callouts',
    title: 'Annotations and callouts',
    icon: MessageSquareText,
  },
  {
    key: 'export',
    label: 'Export',
    title: 'Export',
    icon: ImageDown,
  },
] as const

type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number]['key']
type AnnotationPanelView = 'create' | 'placed'
type AnnotationPlacedView = 'list' | 'detail'
type AnnotationEditorView = 'content' | 'style' | 'position'

const ANNOTATION_TOOLS = [
  { key: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'leader', label: 'Leader callout', icon: MessageSquareText },
  { key: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { key: 'line', label: 'Line', icon: Minus },
  { key: 'result', label: 'Automatic result label', icon: Crosshair },
  { key: 'extrema', label: 'Max / min WSE', icon: ArrowUpDown },
] as const satisfies ReadonlyArray<{
  key: AnnotationTool
  label: string
  icon: typeof MousePointer2
}>

const RESULT_LABEL_OPTIONS: { value: ResultLabelField; label: string }[] = [
  { value: 'summary', label: 'WSE summary' },
  { value: 'difference', label: 'WSE difference' },
  { value: 'existingWse', label: 'Existing WSE' },
  { value: 'proposedWse', label: 'Proposed WSE' },
  { value: 'existingDepth', label: 'Existing depth' },
  { value: 'proposedDepth', label: 'Proposed depth' },
]

const numeric = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

type AnnotationDrag = {
  id: string
  part: AnnotationHitPart
  start: MapCoordinate
  end: MapCoordinate
  originalPoints: MapCoordinate[]
}

type FigureElementDrag = {
  key: MapElementKey
  start: { x: number; y: number }
  originalPosition: FigureSettings['elementPositions'][MapElementKey]
  originalBounds: MapElementBounds
}

type AssessmentCalloutDrag = {
  lineId: string
  startScreen: { x: number; y: number }
  startPointer: MapCoordinate
  originalRenderedPoint: MapCoordinate
  originalOverridePoint?: MapCoordinate
  moved: boolean
}

function assessmentWseLabel(level: number) {
  return `WSE ${level.toFixed(1)} ft`
}

function draggedAnnotationPoints(
  annotation: MapAnnotation,
  drag: AnnotationDrag,
) {
  const dx = drag.end.x - drag.start.x
  const dy = drag.end.y - drag.start.y
  return moveAnnotationPoints(
    annotation,
    drag.part,
    drag.originalPoints,
    dx,
    dy,
  )
}

function updateDraggedResultAnnotation(
  annotation: MapAnnotation,
  dragPart: AnnotationHitPart,
  scene: WseDifferenceScene | null,
  engine: HydraulicEngine,
  settings: FigureSettings,
) {
  if (
    annotation.kind !== 'result' ||
    !annotation.resultField ||
    !scene ||
    (dragPart !== 'start' && dragPart !== 'segment')
  ) {
    return annotation
  }
  const sample = sampleHydraulicResult(
    scene,
    engine.commonBounds(),
    settings,
    annotation.points[0],
  )
  return sample
    ? {
        ...annotation,
        text: formatHydraulicResultLabel(annotation.resultField, sample),
      }
    : annotation
}

function defaultExtremumLabelPoint(
  extremum: WseDifferenceExtremum,
  bounds: Bounds,
  settings: FigureSettings,
) {
  const frame = FRAMES[settings.orientation]
  const target = mapPointToCanvas(extremum.point, bounds, settings)
  const horizontalOffset = target.x < frame.width / 2 ? 190 : -190
  const verticalOffset = extremum.kind === 'max-rise' ? -90 : 90
  const label = {
    x: Math.max(
      190,
      Math.min(frame.width - 190, target.x + horizontalOffset),
    ),
    y: Math.max(
      65,
      Math.min(frame.height - 65, target.y + verticalOffset),
    ),
  }
  return canvasPointToMap(label.x, label.y, bounds, settings)
}

function extremumDisplayName(kind: WseExtremumKind) {
  return kind === 'max-rise' ? 'Max WSE rise' : 'Max WSE reduction'
}

function annotationDisplayName(annotation: MapAnnotation, index: number) {
  return annotation.hydraulicExtremum
    ? extremumDisplayName(annotation.hydraulicExtremum)
    : `${annotation.kind.charAt(0).toUpperCase()}${annotation.kind.slice(1)} ${index + 1}`
}

function annotationHasContentEditor(annotation: MapAnnotation) {
  return annotation.kind !== 'line' && annotation.kind !== 'arrow'
}

function defaultEditorView(annotation: MapAnnotation): AnnotationEditorView {
  return annotationHasContentEditor(annotation) ? 'content' : 'style'
}

function pointSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }
  const fraction = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared,
    ),
  )
  return Math.hypot(
    point.x - (start.x + dx * fraction),
    point.y - (start.y + dy * fraction),
  )
}

function assessmentLineAt(
  lines: WseAssessmentLine[],
  bounds: Bounds,
  settings: FigureSettings,
  point: { x: number; y: number },
) {
  let closest: { line: WseAssessmentLine; distance: number } | null = null
  for (const line of lines) {
    for (let index = 1; index < line.points.length; index += 1) {
      const start = mapPointToCanvas(
        line.points[index - 1],
        bounds,
        settings,
      )
      const end = mapPointToCanvas(line.points[index], bounds, settings)
      const distance = pointSegmentDistance(point, start, end)
      if (distance <= 10 && (!closest || distance < closest.distance)) {
        closest = { line, distance }
      }
    }
  }
  return closest?.line ?? null
}

function App() {
  const [engine] = useState(() => new HydraulicEngine())
  const [dataVersion, setDataVersion] = useState(0)
  const [settings, setSettings] = useState<FigureSettings>(
    createDefaultFigureSettings,
  )
  const assessmentWorkflow = useAssessmentWorkflow(1)
  const assessmentState = assessmentWorkflow.state
  const assessmentLines = assessmentState.collection
  const [existingRun, setExistingRun] = useState(0)
  const [proposedRun, setProposedRun] = useState(0)
  const [overlays, setOverlays] = useState<MapOverlay[]>([])
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [annotationTool, setAnnotationTool] =
    useState<AnnotationTool>('select')
  const [annotationPanelView, setAnnotationPanelView] =
    useState<AnnotationPanelView>('create')
  const [annotationPlacedView, setAnnotationPlacedView] =
    useState<AnnotationPlacedView>('list')
  const [annotationEditorView, setAnnotationEditorView] =
    useState<AnnotationEditorView>('content')
  const [annotationDefaults, setAnnotationDefaults] =
    useState<AnnotationDefaults>(createDefaultAnnotationSettings)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  )
  const [annotationStart, setAnnotationStart] = useState<MapCoordinate | null>(
    null,
  )
  const [annotationDragging, setAnnotationDragging] = useState(false)
  const [assessmentCalloutDragging, setAssessmentCalloutDragging] =
    useState(false)
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSectionKey>('calculation')
  const [activeElement, setActiveElement] =
    useState<MapElementKey>('title')
  const [hoveredElement, setHoveredElement] =
    useState<MapElementKey | null>(null)
  const [elementDragging, setElementDragging] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({
    width: 0,
    height: 0,
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const renderSequence = useRef(0)
  const annotationDragRef = useRef<AnnotationDrag | null>(null)
  const assessmentCalloutDragRef = useRef<AssessmentCalloutDrag | null>(null)
  const annotationListItemRefs = useRef(
    new globalThis.Map<string, HTMLButtonElement>(),
  )
  const figureElementDragRef = useRef<FigureElementDrag | null>(null)
  const elementBoundsRef = useRef<MapElementBounds[]>([])

  const existingCondition = engine.condition('EX')
  const proposedCondition = engine.condition('PR')
  const existingRuns = engine.runOptions('EX')
  const proposedRuns = engine.runOptions('PR')
  const ready = engine.isReady()
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
  const centerlineCandidates = useMemo(() => {
    const modelWkt = existingCondition?.geometry?.wkt
    if (!modelWkt) return []
    try {
      return extractCenterlineCandidates(overlays, modelWkt)
    } catch {
      return []
    }
  }, [existingCondition?.geometry?.wkt, overlays])
  const selectedCenterline =
    centerlineCandidates.find(
      (candidate) => candidate.id === assessmentState.centerlineId,
    ) ?? null
  const stationedAssessmentLines = useMemo(
    () =>
      selectedCenterline
        ? stationAssessmentLines(
            assessmentLines.lines,
            selectedCenterline,
            assessmentState.direction,
            assessmentState.startStation,
            assessmentState.overrides,
          )
        : null,
    [
      assessmentLines.lines,
      assessmentState.direction,
      assessmentState.overrides,
      assessmentState.startStation,
      selectedCenterline,
    ],
  )
  const assessmentExportLayer = useMemo<AssessmentMapLayer>(() => {
    if (!stationedAssessmentLines) return { lines: assessmentLines.lines }
    const included = stationedAssessmentLines.items.filter(
      (item) => item.status === 'included' && item.selectedIntersection,
    )
    return {
      lines: included.map((item) => item.line),
      wseCallouts: included
        .filter(
          (item) =>
            assessmentState.overrides[item.line.id]?.labelVisible !== false,
        )
        .map((item) => ({
          lineId: item.line.id,
          text: assessmentWseLabel(item.line.level),
          target: item.selectedIntersection!.mapPoint,
          tangent: item.selectedIntersection!.mapTangent,
          labelPoint:
            assessmentState.overrides[item.line.id]?.labelPoint,
        })),
    }
  }, [
    assessmentLines.lines,
    assessmentState.overrides,
    stationedAssessmentLines,
  ])
  const assessmentDisplayLayer = useMemo<AssessmentMapLayer>(() => {
    const displayLayer = {
      ...assessmentExportLayer,
      selectedCalloutId: assessmentState.selectedLineId,
    }
    if (
      assessmentState.panelView !== 'review' ||
      !stationedAssessmentLines
    ) {
      return displayLayer
    }
    const selectedItem =
      stationedAssessmentLines.items.find(
        (item) => item.line.id === assessmentState.selectedLineId,
      ) ?? null
    return {
      ...displayLayer,
      selectedLine: selectedItem?.line ?? null,
      endpoints: {
        a: stationedAssessmentLines.centerline.mapPoints[0],
        b: stationedAssessmentLines.centerline.mapPoints.at(-1)!,
      },
      intersections:
        selectedItem?.intersections.map((intersection) => ({
          point: intersection.mapPoint,
          index: intersection.index,
          selected:
            intersection.index === selectedItem.selectedIntersectionIndex,
        })) ?? [],
    }
  }, [
    assessmentExportLayer,
    assessmentState.panelView,
    assessmentState.selectedLineId,
    stationedAssessmentLines,
  ])

  useEffect(() => {
    if (
      assessmentState.centerlineId &&
      existingCondition?.geometry?.wkt &&
      overlays.length > 0 &&
      !centerlineCandidates.some(
        (candidate) => candidate.id === assessmentState.centerlineId,
      )
    ) {
      assessmentWorkflow.setCenterline('')
      return
    }
    if (
      !assessmentState.centerlineId &&
      centerlineCandidates.length === 1
    ) {
      assessmentWorkflow.setCenterline(centerlineCandidates[0].id)
    }
  }, [
    assessmentState.centerlineId,
    centerlineCandidates,
    existingCondition?.geometry?.wkt,
    overlays.length,
    assessmentWorkflow,
  ])

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
      const incoming = await engine.ingest(
        files.filter((file) => /\.h5$/i.test(file.name)),
      )
      appendNotices(incoming)
      setDataVersion((value) => value + 1)
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
    engine.removeCondition(key)
    if (key === 'EX') {
      setExistingRun(0)
    } else {
      setProposedRun(0)
    }
    setScene(null)
    if (key === 'EX') {
      assessmentWorkflow.clear(settings.assessmentLineInterval)
    }
    setDataVersion((value) => value + 1)
  }

  const generateAssessmentLines = () => {
    setBusy(true)
    try {
      const collection = engine.buildExistingWseAssessmentLines(
        existingRun,
        settings.dryDepth,
        settings.assessmentLineInterval,
      )
      if (collection.lines.length === 0) {
        throw new Error(
          'No Existing WSE assessment lines were found at this interval and dry-depth threshold.',
        )
      }
      assessmentWorkflow.setCollection(collection)
      appendNotices([
        {
          level: 'success',
          text: `Generated ${collection.lines.length.toLocaleString()} Existing WSE assessment lines across ${collection.levelCount.toLocaleString()} elevation levels.`,
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
      const nextScene = engine.buildWseDifference(
        existingRun,
        proposedRun,
        settings.dryDepth,
      )
      if (nextScene.validDifferenceNodes === 0) {
        throw new Error(
          'The selected runs have no overlapping valid WSE values at this dry-depth threshold.',
        )
      }
      setScene(nextScene)
      const nextAssessmentLines = engine.buildExistingWseAssessmentLines(
        existingRun,
        settings.dryDepth,
        settings.assessmentLineInterval,
      )
      assessmentWorkflow.setCollection(nextAssessmentLines)
      appendNotices([
        {
          level: 'success',
          text: `WSE difference ready from ${nextScene.validDifferenceNodes.toLocaleString()} comparable Existing nodes with ${nextAssessmentLines.lines.length.toLocaleString()} Existing WSE assessment lines.`,
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

  useEffect(() => {
    if (existingRun >= existingRuns.length) setExistingRun(0)
    if (proposedRun >= proposedRuns.length) setProposedRun(0)
  }, [dataVersion, existingRun, existingRuns.length, proposedRun, proposedRuns.length])

  useEffect(() => {
    if (!scene || !canvasRef.current) return
    const sequence = ++renderSequence.current
    const renderCanvas = document.createElement('canvas')
    const controller = new AbortController()
    if (
      !annotationDragging &&
      !assessmentCalloutDragging &&
      !elementDragging
    ) {
      setBusy(true)
    }
    void renderWseDifferenceMap(
      renderCanvas,
      scene,
      engine.commonBounds(),
      settings,
      overlays,
      assessmentDisplayLayer,
      annotations,
      selectedAnnotationId,
      activeSettingsSection === 'elements' ? activeElement : null,
      controller.signal,
    )
      .then((elementBounds) => {
        if (renderSequence.current !== sequence || !canvasRef.current) return
        elementBoundsRef.current = elementBounds
        const visibleCanvas = canvasRef.current
        visibleCanvas.width = renderCanvas.width
        visibleCanvas.height = renderCanvas.height
        const context = visibleCanvas.getContext('2d')
        if (!context) {
          throw new Error('This browser could not publish the rendered map.')
        }
        context.drawImage(renderCanvas, 0, 0)
      })
      .catch((error) => {
        if (renderSequence.current !== sequence) return
        appendNotices([
          {
            level: 'error',
            text: `Map rendering failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ])
      })
      .finally(() => {
        if (
          renderSequence.current === sequence &&
          !annotationDragging &&
          !assessmentCalloutDragging &&
          !elementDragging
        ) {
          setBusy(false)
        }
      })
    return () => controller.abort()
  }, [
    annotations,
    assessmentDisplayLayer,
    assessmentCalloutDragging,
    annotationDragging,
    activeElement,
    activeSettingsSection,
    appendNotices,
    elementDragging,
    engine,
    overlays,
    scene,
    selectedAnnotationId,
    settings,
  ])

  useEffect(() => {
    const frame = canvasFrameRef.current
    if (!frame) return

    const fitCanvas = () => {
      const { width, height } = frame.getBoundingClientRect()
      const aspect = FRAME_ASPECTS[settings.orientation]
      const fittedWidth = Math.min(width, height * aspect)
      const fittedHeight = fittedWidth / aspect

      setCanvasDisplaySize((current) =>
        Math.abs(current.width - fittedWidth) < 0.5 &&
        Math.abs(current.height - fittedHeight) < 0.5
          ? current
          : { width: fittedWidth, height: fittedHeight },
      )
    }

    const observer = new ResizeObserver(fitCanvas)
    observer.observe(frame)
    fitCanvas()

    return () => observer.disconnect()
  }, [settings.orientation])

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
  }, [engine, scene, settings])

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
  }, [wseExtrema])

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
  }, [selectedAnnotationId])

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

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const screenPoint = pointerCanvasPoint(event)
    if (figureElementDragRef.current) {
      moveFigureElementDrag(screenPoint)
      return
    }
    if (assessmentCalloutDragRef.current) {
      moveAssessmentCalloutDrag(screenPoint)
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
      assessmentCalloutDragRef.current = null
      setAssessmentCalloutDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
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
    engine.reset()
    setDataVersion((value) => value + 1)
    setOverlays([])
    setAnnotations([])
    setSelectedAnnotationId(null)
    setAnnotationStart(null)
    setAnnotationTool('select')
    setAnnotationPanelView('create')
    setAnnotationPlacedView('list')
    setAnnotationEditorView('content')
    setLeftCollapsed(false)
    setAnnotationDefaults(createDefaultAnnotationSettings())
    assessmentCalloutDragRef.current = null
    setAssessmentCalloutDragging(false)
    figureElementDragRef.current = null
    elementBoundsRef.current = []
    setElementDragging(false)
    setHoveredElement(null)
    setActiveElement('title')
    setScene(null)
    assessmentWorkflow.reset(1)
    setNotices([])
    setExistingRun(0)
    setProposedRun(0)
    setSettings(createDefaultFigureSettings())
  }

  const downloadMap = async () => {
    if (!scene) return
    setBusy(true)
    try {
      const exportCanvas = document.createElement('canvas')
      await renderWseDifferenceMap(
        exportCanvas,
        scene,
        engine.commonBounds(),
        settings,
        overlays,
        assessmentExportLayer,
        annotations,
      )
      exportCanvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `FRA_WSE_Difference_${runDisplayName(scene.existing.run.name).replace(/\s+/g, '_')}_${runDisplayName(scene.proposed.run.name).replace(/\s+/g, '_')}.png`
        anchor.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
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
      selectedRuns: { existingRun, proposedRun },
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
      setAnnotationStart(null)
      setAnnotationPanelView('create')
      setAnnotationPlacedView('list')
      setAnnotationEditorView('content')
      setLeftCollapsed(false)
      setExistingRun(project.selectedRuns?.existingRun ?? 0)
      setProposedRun(project.selectedRuns?.proposedRun ?? 0)
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
            <p>FRA workspace · WSE difference</p>
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
          existingCondition={existingCondition}
          proposedCondition={proposedCondition}
          existingRuns={existingRuns}
          proposedRuns={proposedRuns}
          existingRun={existingRun}
          proposedRun={proposedRun}
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
            onMobileClose: () => setLeftOpen(false),
            onCenterlineChange: assessmentWorkflow.setCenterline,
            onDirectionChange: assessmentWorkflow.setDirection,
            onStartStationChange: assessmentWorkflow.setStartStation,
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
          onExistingRunChange={(index) => {
            setExistingRun(index)
            setScene(null)
            assessmentWorkflow.clear(settings.assessmentLineInterval)
          }}
          onProposedRunChange={(index) => {
            setProposedRun(index)
            setScene(null)
          }}
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
              <strong>WSE Difference</strong>
              <span>Proposed minus Existing</span>
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
                <h2>Build an FRA WSE difference figure</h2>
                <p>
                  Add Existing and Proposed geometry and datasets on the left,
                  pair the runs, then generate the map.
                </p>
                <button
                  className="button primary"
                  type="button"
                  disabled={!ready || busy}
                  data-testid="generate-empty-map"
                  onClick={generateMap}
                >
                  <Map size={17} aria-hidden="true" />
                  Generate WSE difference
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
            <ControlSection>
              <label className="field">
                <span>
                  Dry-depth threshold
                  <small>ft</small>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.dryDepth}
                  onChange={(event) => {
                    updateSettings(
                      'dryDepth',
                      numeric(event.target.value, 0),
                    )
                    setScene(null)
                    assessmentWorkflow.clear(
                      settings.assessmentLineInterval,
                    )
                  }}
                />
              </label>
              <p className="field-help">
                Depths at or below this value are dry. At 0.00 ft, every
                positive modeled depth is wet.
              </p>
              <Toggle
                label="Newly wet/dry fill"
                checked={settings.showWetDry}
                onChange={(checked) => updateSettings('showWetDry', checked)}
              />
              <Toggle
                label="Existing WSE assessment lines"
                checked={settings.showAssessmentLines}
                onChange={(checked) =>
                  updateSettings('showAssessmentLines', checked)
                }
              />
              <div className="field-grid two">
                <label className="field color-field">
                  <span>Assessment color</span>
                  <input
                    type="color"
                    value={settings.assessmentLineColor}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLineColor',
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    Line width
                    <small>px</small>
                  </span>
                  <input
                    type="number"
                    min="0.25"
                    max="12"
                    step="0.25"
                    value={settings.assessmentLineWidth}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLineWidth',
                        numeric(event.target.value, 2),
                      )
                    }
                  />
                </label>
              </div>
              <Toggle
                label="Assessment WSE callouts"
                checked={settings.showAssessmentLabels}
                onChange={(checked) =>
                  updateSettings('showAssessmentLabels', checked)
                }
              />
              <div className="field-grid two">
                <label className="field color-field">
                  <span>Label color</span>
                  <input
                    type="color"
                    value={settings.assessmentLabelColor}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLabelColor',
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    Label size
                    <small>px</small>
                  </span>
                  <input
                    type="number"
                    min="6"
                    max="72"
                    step="1"
                    value={settings.assessmentLabelFontSize}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLabelFontSize',
                        numeric(event.target.value, 18),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>
                    Label offset
                    <small>px</small>
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    value={settings.assessmentLabelOffset}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLabelOffset',
                        numeric(event.target.value, 28),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Label side</span>
                  <select
                    value={settings.assessmentLabelSide}
                    onChange={(event) =>
                      updateSettings(
                        'assessmentLabelSide',
                        event.target.value as FigureSettings['assessmentLabelSide'],
                      )
                    }
                  >
                    <option value="alternate">Alternate</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
              <Toggle
                label="WSE difference outlines"
                checked={settings.showDifferenceOutlines}
                onChange={(checked) =>
                  updateSettings('showDifferenceOutlines', checked)
                }
              />
              <label className="field color-field">
                <span>Outline color</span>
                <input
                  type="color"
                  value={settings.differenceOutlineColor}
                  onChange={(event) =>
                    updateSettings(
                      'differenceOutlineColor',
                      event.target.value,
                    )
                  }
                />
              </label>
            </ControlSection>
            ) : null}

            {activeSettingsSection === 'legend' ? (
            <ControlSection>
              <div className="field-grid two">
                <label className="field">
                  <span>Symmetric bound <small>± ft</small></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.25"
                    placeholder="Auto"
                    value={settings.legendBound ?? ''}
                    onChange={(event) =>
                      updateSettings(
                        'legendBound',
                        event.target.value
                          ? numeric(event.target.value, 3)
                          : null,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Legend interval <small>ft</small></span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    placeholder="Auto"
                    value={settings.legendInterval ?? ''}
                    onChange={(event) =>
                      updateSettings(
                        'legendInterval',
                        event.target.value
                          ? numeric(event.target.value, 0.5)
                          : null,
                      )
                    }
                  />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field color-field">
                  <span>Newly inundated</span>
                  <input
                    type="color"
                    value={settings.newlyWetColor}
                    onChange={(event) =>
                      updateSettings('newlyWetColor', event.target.value)
                    }
                  />
                </label>
                <label className="field color-field">
                  <span>Newly dry</span>
                  <input
                    type="color"
                    value={settings.newlyDryColor}
                    onChange={(event) =>
                      updateSettings('newlyDryColor', event.target.value)
                    }
                  />
                </label>
              </div>
            </ControlSection>
            ) : null}

            {activeSettingsSection === 'frame' ? (
            <ControlSection>
              <div className="segmented" aria-label="Figure orientation">
                <button
                  type="button"
                  className={settings.orientation === 'landscape' ? 'active' : ''}
                  onClick={() => updateSettings('orientation', 'landscape')}
                >
                  Landscape
                </button>
                <button
                  type="button"
                  className={settings.orientation === 'portrait' ? 'active' : ''}
                  onClick={() => updateSettings('orientation', 'portrait')}
                >
                  Portrait
                </button>
              </div>
              <label className="range-field">
                <span>
                  Rotation <output>{settings.rotation.toFixed(0)}°</output>
                </span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={settings.rotation}
                  onChange={(event) =>
                    updateSettings('rotation', numeric(event.target.value))
                  }
                />
              </label>
              <label className="range-field">
                <span>
                  Zoom <output>{settings.zoom.toFixed(2)}×</output>
                </span>
                <input
                  type="range"
                  min="0.35"
                  max="4"
                  step="0.05"
                  value={settings.zoom}
                  onChange={(event) =>
                    updateSettings('zoom', numeric(event.target.value, 1))
                  }
                />
              </label>
              <label className="range-field">
                <span>
                  Aerial opacity{' '}
                  <output>{Math.round(settings.basemapOpacity * 100)}%</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.basemapOpacity}
                  onChange={(event) =>
                    updateSettings(
                      'basemapOpacity',
                      numeric(event.target.value, 0.72),
                    )
                  }
                />
              </label>
              <div className="nudge-control map-pan">
                <span>Pan map</span>
                <div className="nudge-buttons">
                  <NudgeButton
                    label="Pan left"
                    icon={<ArrowLeft size={15} />}
                    onClick={() => updateSettings('panX', settings.panX - 30)}
                  />
                  <NudgeButton
                    label="Pan up"
                    icon={<ArrowUp size={15} />}
                    onClick={() => updateSettings('panY', settings.panY - 30)}
                  />
                  <NudgeButton
                    label="Pan down"
                    icon={<ArrowDown size={15} />}
                    onClick={() => updateSettings('panY', settings.panY + 30)}
                  />
                  <NudgeButton
                    label="Pan right"
                    icon={<ArrowRight size={15} />}
                    onClick={() => updateSettings('panX', settings.panX + 30)}
                  />
                  <NudgeButton
                    label="Reset view"
                    icon={<RefreshCcw size={15} />}
                    onClick={resetView}
                  />
                </div>
              </div>
            </ControlSection>
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
              />
            </ControlSection>
            ) : null}

            {activeSettingsSection === 'annotations' ? (
            <ControlSection>
              <div className="annotation-panel">
                <div
                  className="annotation-view-tabs"
                  role="tablist"
                  aria-label="Annotation workspace"
                >
                  <button
                    className={`annotation-view-tab${annotationPanelView === 'create' ? ' active' : ''}`}
                    type="button"
                    id="annotation-view-tab-create"
                    role="tab"
                    aria-controls="annotation-view-panel-create"
                    aria-selected={annotationPanelView === 'create'}
                    tabIndex={annotationPanelView === 'create' ? 0 : -1}
                    onClick={() => chooseAnnotationPanelView('create')}
                    onKeyDown={(event) =>
                      handleAnnotationPanelTabKeyDown(event, 'create')
                    }
                  >
                    <Plus size={15} aria-hidden="true" />
                    <span>Create</span>
                  </button>
                  <button
                    className={`annotation-view-tab${annotationPanelView === 'placed' ? ' active' : ''}`}
                    type="button"
                    id="annotation-view-tab-placed"
                    role="tab"
                    aria-controls="annotation-view-panel-placed"
                    aria-selected={annotationPanelView === 'placed'}
                    tabIndex={annotationPanelView === 'placed' ? 0 : -1}
                    onClick={() => chooseAnnotationPanelView('placed')}
                    onKeyDown={(event) =>
                      handleAnnotationPanelTabKeyDown(event, 'placed')
                    }
                  >
                    <List size={15} aria-hidden="true" />
                    <span>Placed</span>
                    <span className="annotation-view-count">
                      {annotations.length}
                    </span>
                  </button>
                </div>

                {annotationPanelView === 'create' ? (
                  <div
                    className="annotation-view-panel"
                    id="annotation-view-panel-create"
                    role="tabpanel"
                    aria-labelledby="annotation-view-tab-create"
                  >
                    <div
                      className="annotation-tools"
                      role="toolbar"
                      aria-label="Annotation tools"
                    >
                      {ANNOTATION_TOOLS.map((tool) => {
                        const ToolIcon = tool.icon
                        return (
                          <button
                            className={`annotation-tool${annotationTool === tool.key ? ' active' : ''}`}
                            type="button"
                            title={tool.label}
                            aria-label={tool.label}
                            aria-pressed={annotationTool === tool.key}
                            disabled={!scene}
                            key={tool.key}
                            onClick={() => chooseAnnotationTool(tool.key)}
                          >
                            <ToolIcon size={16} aria-hidden="true" />
                            <span>{tool.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {annotationStart ? (
                      <button
                        className="button secondary compact full"
                        type="button"
                        onClick={() => setAnnotationStart(null)}
                      >
                        <X size={15} aria-hidden="true" />
                        Cancel current drawing
                      </button>
                    ) : null}

                    {annotationTool === 'extrema' ? (
                      <div className="extrema-callout-card">
                        <div className="extrema-callout-heading">
                          <ArrowUpDown size={16} aria-hidden="true" />
                          <strong>Maximum WSE change</strong>
                        </div>
                        <div className="extrema-values">
                          <div className="extrema-value rise">
                            <ArrowUp size={14} aria-hidden="true" />
                            <span>Maximum rise</span>
                            <strong>
                              {wseExtrema?.rise
                                ? `+${wseExtrema.rise.value.toFixed(2)} ft`
                                : 'None'}
                            </strong>
                          </div>
                          <div className="extrema-value reduction">
                            <ArrowDown size={14} aria-hidden="true" />
                            <span>Maximum reduction</span>
                            <strong>
                              {wseExtrema?.reduction
                                ? `${wseExtrema.reduction.value.toFixed(2)} ft`
                                : 'None'}
                            </strong>
                          </div>
                        </div>
                        <button
                          className="button secondary compact full"
                          type="button"
                          title="Place labels at the maximum positive and negative Proposed-minus-Existing WSE values"
                          disabled={
                            !scene ||
                            (!wseExtrema?.rise && !wseExtrema?.reduction)
                          }
                          onClick={addWseExtremaCallouts}
                        >
                          <Crosshair size={14} aria-hidden="true" />
                          {extremaCalloutCount > 0
                            ? 'Refresh max / min WSE callouts'
                            : 'Add max / min WSE callouts'}
                        </button>
                      </div>
                    ) : null}

                    {annotationTool === 'text' ||
                    annotationTool === 'leader' ? (
                      <label className="field">
                        <span>New annotation text</span>
                        <textarea
                          className="annotation-textarea"
                          rows={3}
                          value={annotationEditor.text}
                          onChange={(event) =>
                            updateAnnotationAppearance({
                              text: event.target.value,
                            })
                          }
                        />
                      </label>
                    ) : null}

                    {annotationTool === 'result' ? (
                      <label className="field">
                        <span>Automatic result label</span>
                        <select
                          value={activeResultField}
                          onChange={(event) =>
                            setResultLabelField(
                              event.target.value as ResultLabelField,
                            )
                          }
                        >
                          {RESULT_LABEL_OPTIONS.map((option) => (
                            <option value={option.value} key={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {annotationTool !== 'select' ? (
                      <>
                        <div className="annotation-style-heading">
                          <span>New item style</span>
                        </div>
                        <div className="field-grid two">
                          <label className="field color-field">
                            <span>Color</span>
                            <input
                              type="color"
                              value={annotationEditor.color}
                              onChange={(event) =>
                                updateAnnotationAppearance({
                                  color: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="field color-field">
                            <span>Box fill</span>
                            <input
                              type="color"
                              value={annotationEditor.fillColor}
                              onChange={(event) =>
                                updateAnnotationAppearance({
                                  fillColor: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="field-grid two">
                          <label className="field">
                            <span>Line width <small>px</small></span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              step="0.5"
                              value={annotationEditor.lineWidth}
                              onChange={(event) =>
                                updateAnnotationAppearance({
                                  lineWidth: numeric(event.target.value, 3),
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Text size <small>px</small></span>
                            <input
                              type="number"
                              min="10"
                              max="48"
                              step="1"
                              value={annotationEditor.fontSize}
                              onChange={(event) =>
                                updateAnnotationAppearance({
                                  fontSize: numeric(event.target.value, 20),
                                })
                              }
                            />
                          </label>
                        </div>
                        {annotationTool !== 'line' &&
                        annotationTool !== 'arrow' ? (
                          <label className="field">
                            <span>Text rotation <small>degrees</small></span>
                            <div className="annotation-rotation-control">
                              <input
                                type="range"
                                min="-180"
                                max="180"
                                step="1"
                                aria-label="Text rotation slider"
                                value={annotationEditor.rotation ?? 0}
                                onChange={(event) =>
                                  updateAnnotationAppearance({
                                    rotation: numeric(event.target.value, 0),
                                  })
                                }
                              />
                              <input
                                type="number"
                                min="-180"
                                max="180"
                                step="1"
                                aria-label="Text rotation degrees"
                                value={annotationEditor.rotation ?? 0}
                                onChange={(event) =>
                                  updateAnnotationAppearance({
                                    rotation: Math.max(
                                      -180,
                                      Math.min(
                                        180,
                                        numeric(event.target.value, 0),
                                      ),
                                    ),
                                  })
                                }
                              />
                            </div>
                          </label>
                        ) : null}
                        <Toggle
                          label="Dashed line"
                          checked={annotationEditor.dashed}
                          onChange={(checked) =>
                            updateAnnotationAppearance({ dashed: checked })
                          }
                        />
                        {annotationTool !== 'line' &&
                        annotationTool !== 'arrow' ? (
                          <Toggle
                            label="Text background"
                            checked={annotationEditor.background}
                            onChange={(checked) =>
                              updateAnnotationAppearance({
                                background: checked,
                              })
                            }
                          />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className={`annotation-view-panel annotation-manager ${annotationPlacedView}-view`}
                    id="annotation-view-panel-placed"
                    role="tabpanel"
                    aria-labelledby="annotation-view-tab-placed"
                  >
                    {annotationPlacedView === 'list' ? (
                      annotations.length === 0 ? (
                        <div className="annotation-manager-empty">
                          <p>No annotations placed yet.</p>
                          <button
                            className="button secondary compact"
                            type="button"
                            onClick={() => chooseAnnotationPanelView('create')}
                          >
                            <Plus size={14} aria-hidden="true" />
                            Create annotation
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="annotation-list"
                            role="listbox"
                            aria-label="Placed annotations"
                          >
                            {annotations.map((annotation, index) => (
                              <button
                                className={`annotation-list-item${annotation.id === selectedAnnotationId ? ' active' : ''}`}
                                type="button"
                                role="option"
                                aria-selected={
                                  annotation.id === selectedAnnotationId
                                }
                                tabIndex={
                                  annotation.id === selectedAnnotationId ||
                                  (!selectedAnnotationId && index === 0)
                                    ? 0
                                    : -1
                                }
                                ref={(node) => {
                                  if (node) {
                                    annotationListItemRefs.current.set(
                                      annotation.id,
                                      node,
                                    )
                                  } else {
                                    annotationListItemRefs.current.delete(
                                      annotation.id,
                                    )
                                  }
                                }}
                                key={annotation.id}
                                onClick={() =>
                                  selectPlacedAnnotation(annotation)
                                }
                                onKeyDown={(event) =>
                                  handleAnnotationListKeyDown(event, index)
                                }
                              >
                                <span>
                                  {annotationDisplayName(annotation, index)}
                                </span>
                                <small>
                                  {annotation.text.split(/\r?\n/)[0] ||
                                    'Untitled'}
                                </small>
                                <ChevronRight
                                  size={14}
                                  aria-hidden="true"
                                />
                              </button>
                            ))}
                          </div>
                          <button
                            className="text-button annotation-clear"
                            type="button"
                            onClick={() => {
                              setAnnotations([])
                              setSelectedAnnotationId(null)
                              setAnnotationStart(null)
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Clear all annotations
                          </button>
                        </>
                      )
                    ) : selectedAnnotation ? (
                      <div className="annotation-detail">
                        <div className="annotation-detail-header">
                          <button
                            className="icon-button compact"
                            type="button"
                            title="Back to placed annotations"
                            aria-label="Back to placed annotations"
                            onClick={returnToPlacedAnnotations}
                          >
                            <ChevronLeft size={17} aria-hidden="true" />
                          </button>
                          <div className="annotation-detail-title">
                            <strong>
                              {annotationDisplayName(
                                selectedAnnotation,
                                selectedAnnotationIndex,
                              )}
                            </strong>
                            <small>
                              {selectedAnnotationIndex + 1} of{' '}
                              {annotations.length}
                            </small>
                          </div>
                          <div className="annotation-detail-paging">
                            <button
                              className="icon-button compact"
                              type="button"
                              title="Previous annotation"
                              aria-label="Previous annotation"
                              disabled={annotations.length < 2}
                              onClick={() => selectAdjacentAnnotation(-1)}
                            >
                              <ChevronLeft size={16} aria-hidden="true" />
                            </button>
                            <button
                              className="icon-button compact"
                              type="button"
                              title="Next annotation"
                              aria-label="Next annotation"
                              disabled={annotations.length < 2}
                              onClick={() => selectAdjacentAnnotation(1)}
                            >
                              <ChevronRight size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div
                          className="annotation-editor-tabs"
                          role="tablist"
                          aria-label="Annotation editor sections"
                        >
                          {annotationHasContentEditor(selectedAnnotation) ? (
                            <button
                              className={`annotation-editor-tab${annotationEditorView === 'content' ? ' active' : ''}`}
                              type="button"
                              id="annotation-editor-tab-content"
                              role="tab"
                              aria-controls="annotation-editor-panel-content"
                              aria-selected={
                                annotationEditorView === 'content'
                              }
                              tabIndex={
                                annotationEditorView === 'content' ? 0 : -1
                              }
                              onClick={() =>
                                setAnnotationEditorView('content')
                              }
                              onKeyDown={(event) =>
                                handleAnnotationEditorTabKeyDown(
                                  event,
                                  'content',
                                )
                              }
                            >
                              <Type size={14} aria-hidden="true" />
                              Content
                            </button>
                          ) : null}
                          <button
                            className={`annotation-editor-tab${annotationEditorView === 'style' ? ' active' : ''}`}
                            type="button"
                            id="annotation-editor-tab-style"
                            role="tab"
                            aria-controls="annotation-editor-panel-style"
                            aria-selected={annotationEditorView === 'style'}
                            tabIndex={
                              annotationEditorView === 'style' ? 0 : -1
                            }
                            onClick={() => setAnnotationEditorView('style')}
                            onKeyDown={(event) =>
                              handleAnnotationEditorTabKeyDown(event, 'style')
                            }
                          >
                            <Palette size={14} aria-hidden="true" />
                            Style
                          </button>
                          <button
                            className={`annotation-editor-tab${annotationEditorView === 'position' ? ' active' : ''}`}
                            type="button"
                            id="annotation-editor-tab-position"
                            role="tab"
                            aria-controls="annotation-editor-panel-position"
                            aria-selected={annotationEditorView === 'position'}
                            tabIndex={
                              annotationEditorView === 'position' ? 0 : -1
                            }
                            onClick={() => setAnnotationEditorView('position')}
                            onKeyDown={(event) =>
                              handleAnnotationEditorTabKeyDown(
                                event,
                                'position',
                              )
                            }
                          >
                            <MapPin size={14} aria-hidden="true" />
                            Position
                          </button>
                        </div>

                        {annotationEditorView === 'content' ? (
                          <div
                            className="annotation-editor-panel"
                            id="annotation-editor-panel-content"
                            role="tabpanel"
                            aria-labelledby="annotation-editor-tab-content"
                          >
                            {selectedAnnotation.kind === 'result' &&
                            !selectedAnnotation.hydraulicExtremum ? (
                              <label className="field">
                                <span>Automatic result label</span>
                                <select
                                  value={activeResultField}
                                  onChange={(event) =>
                                    setResultLabelField(
                                      event.target.value as ResultLabelField,
                                    )
                                  }
                                >
                                  {RESULT_LABEL_OPTIONS.map((option) => (
                                    <option
                                      value={option.value}
                                      key={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <label className="field">
                                <span>Text</span>
                                <textarea
                                  className="annotation-textarea"
                                  rows={4}
                                  value={annotationEditor.text}
                                  onChange={(event) =>
                                    updateAnnotationAppearance({
                                      text: event.target.value,
                                    })
                                  }
                                />
                              </label>
                            )}
                          </div>
                        ) : null}

                        {annotationEditorView === 'style' ? (
                          <div
                            className="annotation-editor-panel"
                            id="annotation-editor-panel-style"
                            role="tabpanel"
                            aria-labelledby="annotation-editor-tab-style"
                          >
                            <div className="field-grid two">
                              <label className="field color-field">
                                <span>Color</span>
                                <input
                                  type="color"
                                  value={annotationEditor.color}
                                  onChange={(event) =>
                                    updateAnnotationAppearance({
                                      color: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              {annotationHasContentEditor(
                                selectedAnnotation,
                              ) ? (
                                <label className="field color-field">
                                  <span>Box fill</span>
                                  <input
                                    type="color"
                                    value={annotationEditor.fillColor}
                                    onChange={(event) =>
                                      updateAnnotationAppearance({
                                        fillColor: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              ) : null}
                            </div>
                            <div className="field-grid two">
                              <label className="field">
                                <span>Line width <small>px</small></span>
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  step="0.5"
                                  value={annotationEditor.lineWidth}
                                  onChange={(event) =>
                                    updateAnnotationAppearance({
                                      lineWidth: numeric(event.target.value, 3),
                                    })
                                  }
                                />
                              </label>
                              {annotationHasContentEditor(
                                selectedAnnotation,
                              ) ? (
                                <label className="field">
                                  <span>Text size <small>px</small></span>
                                  <input
                                    type="number"
                                    min="10"
                                    max="48"
                                    step="1"
                                    value={annotationEditor.fontSize}
                                    onChange={(event) =>
                                      updateAnnotationAppearance({
                                        fontSize: numeric(
                                          event.target.value,
                                          20,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              ) : null}
                            </div>
                            {annotationHasContentEditor(selectedAnnotation) ? (
                              <label className="field">
                                <span>
                                  Text rotation <small>degrees</small>
                                </span>
                                <div className="annotation-rotation-control">
                                  <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    step="1"
                                    aria-label="Text rotation slider"
                                    value={annotationEditor.rotation ?? 0}
                                    onChange={(event) =>
                                      updateAnnotationAppearance({
                                        rotation: numeric(
                                          event.target.value,
                                          0,
                                        ),
                                      })
                                    }
                                  />
                                  <input
                                    type="number"
                                    min="-180"
                                    max="180"
                                    step="1"
                                    aria-label="Text rotation degrees"
                                    value={annotationEditor.rotation ?? 0}
                                    onChange={(event) =>
                                      updateAnnotationAppearance({
                                        rotation: Math.max(
                                          -180,
                                          Math.min(
                                            180,
                                            numeric(event.target.value, 0),
                                          ),
                                        ),
                                      })
                                    }
                                  />
                                </div>
                              </label>
                            ) : null}
                            <Toggle
                              label="Dashed line"
                              checked={annotationEditor.dashed}
                              onChange={(checked) =>
                                updateAnnotationAppearance({
                                  dashed: checked,
                                })
                              }
                            />
                            {annotationHasContentEditor(selectedAnnotation) ? (
                              <Toggle
                                label="Text background"
                                checked={annotationEditor.background}
                                onChange={(checked) =>
                                  updateAnnotationAppearance({
                                    background: checked,
                                  })
                                }
                              />
                            ) : null}
                          </div>
                        ) : null}

                        {annotationEditorView === 'position' ? (
                          <div
                            className="annotation-editor-panel"
                            id="annotation-editor-panel-position"
                            role="tabpanel"
                            aria-labelledby="annotation-editor-tab-position"
                          >
                            <div className="nudge-control">
                              <span>Move selected</span>
                              <div className="nudge-buttons">
                                <NudgeButton
                                  label="Move annotation left"
                                  icon={<ArrowLeft size={14} />}
                                  onClick={() =>
                                    nudgeSelectedAnnotation(-10, 0)
                                  }
                                />
                                <NudgeButton
                                  label="Move annotation up"
                                  icon={<ArrowUp size={14} />}
                                  onClick={() =>
                                    nudgeSelectedAnnotation(0, -10)
                                  }
                                />
                                <NudgeButton
                                  label="Move annotation down"
                                  icon={<ArrowDown size={14} />}
                                  onClick={() =>
                                    nudgeSelectedAnnotation(0, 10)
                                  }
                                />
                                <NudgeButton
                                  label="Move annotation right"
                                  icon={<ArrowRight size={14} />}
                                  onClick={() =>
                                    nudgeSelectedAnnotation(10, 0)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="annotation-detail-actions">
                          <button
                            className="button secondary compact"
                            type="button"
                            onClick={duplicateSelectedAnnotation}
                          >
                            <Copy size={15} aria-hidden="true" />
                            Duplicate
                          </button>
                          <button
                            className="button danger-outline compact"
                            type="button"
                            onClick={deleteSelectedAnnotation}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </ControlSection>
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
                Add both conditions first
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

type ToggleProps = {
  label: string
  checked: boolean
  onChange(checked: boolean): void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

type NudgeButtonProps = {
  label: string
  icon: React.ReactNode
  onClick(): void
}

function NudgeButton({ label, icon, onClick }: NudgeButtonProps) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

export default App
