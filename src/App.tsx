import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  Crosshair,
  Download,
  FileJson,
  FolderOpen,
  ImageDown,
  Layers3,
  Map,
  MapPin,
  MessageSquareText,
  Minus,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Palette,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Type,
  UploadCloud,
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
import { FileDrop } from './components/FileDrop'
import { FigureElementsPanel } from './components/FigureElementsPanel'
import {
  cloneDefaultElementStyles,
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
  formatHydraulicResultLabel,
  FRAMES,
  hitTestAnnotation,
  mapPointToCanvas,
  moveAnnotationPoints,
  renderWseDifferenceMap,
  sampleHydraulicResult,
  type AnnotationHitPart,
} from './core/mapRenderer'
import { readShapefileOverlays } from './core/shapefile'
import type {
  AnnotationDefaults,
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
  WseExtremumKind,
  WseDifferenceScene,
} from './core/types'

const DEFAULT_SETTINGS: FigureSettings = {
  orientation: 'landscape',
  dryDepth: 0,
  differenceOutlineColor: '#111111',
  showDifferenceOutlines: true,
  showWetDry: true,
  showOverlays: true,
  showTitle: true,
  showLegend: true,
  showNorth: true,
  showScale: true,
  showWetDryKey: true,
  titleTemplate: '{type} - {existing} vs {proposed}',
  legendBound: null,
  legendInterval: null,
  legendFontSize: 19,
  newlyWetColor: '#2cc88b',
  newlyDryColor: '#e97768',
  basemapOpacity: 0.72,
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
  elementStyles: cloneDefaultElementStyles(),
}

const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

const DEFAULT_ANNOTATION_SETTINGS: AnnotationDefaults = {
  text: 'Note',
  color: '#b42318',
  fillColor: '#ffffff',
  lineWidth: 3,
  fontSize: 20,
  dashed: false,
  background: true,
  resultField: 'summary',
}

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

const ANNOTATION_TOOLS = [
  { key: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'leader', label: 'Leader callout', icon: MessageSquareText },
  { key: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { key: 'line', label: 'Line', icon: Minus },
  { key: 'result', label: 'Automatic result label', icon: Crosshair },
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

function cloneDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
    elementStyles: cloneDefaultElementStyles(),
  }
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

function annotationGuidance(tool: AnnotationTool, hasStart: boolean) {
  if (hasStart) {
    if (tool === 'leader') return 'Choose label position'
    if (tool === 'arrow') return 'Choose arrowhead'
    return 'Choose endpoint'
  }
  if (tool === 'select') {
    return 'Drag a label to move it, its endpoint to retarget, or its line to move the whole item'
  }
  if (tool === 'text') return 'Place text'
  if (tool === 'leader') return 'Choose callout target'
  if (tool === 'arrow') return 'Choose arrow tail'
  if (tool === 'line') return 'Choose line start'
  return 'Choose result location'
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

function App() {
  const [engine] = useState(() => new HydraulicEngine())
  const [dataVersion, setDataVersion] = useState(0)
  const [settings, setSettings] = useState<FigureSettings>(cloneDefaultSettings)
  const [existingRun, setExistingRun] = useState(0)
  const [proposedRun, setProposedRun] = useState(0)
  const [overlays, setOverlays] = useState<MapOverlay[]>([])
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [annotationTool, setAnnotationTool] =
    useState<AnnotationTool>('select')
  const [annotationDefaults, setAnnotationDefaults] =
    useState<AnnotationDefaults>(DEFAULT_ANNOTATION_SETTINGS)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  )
  const [annotationStart, setAnnotationStart] = useState<MapCoordinate | null>(
    null,
  )
  const [annotationDragging, setAnnotationDragging] = useState(false)
  const [notices, setNotices] = useState<IngestNotice[]>([])
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
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
      appendNotices([
        {
          level: 'success',
          text: `WSE difference ready from ${nextScene.validDifferenceNodes.toLocaleString()} comparable Existing nodes.`,
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
    if (!annotationDragging && !elementDragging) setBusy(true)
    void renderWseDifferenceMap(
      renderCanvas,
      scene,
      engine.commonBounds(),
      settings,
      overlays,
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
          !elementDragging
        ) {
          setBusy(false)
        }
      })
    return () => controller.abort()
  }, [
    annotations,
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
          dashed: annotationDefaults.dashed,
          background: true,
        })
      }
      return next
    })

    setSelectedAnnotationId(ids.get(extrema[0].kind) ?? null)
    setAnnotationTool('select')
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
    setAnnotationTool(tool)
    setAnnotationStart(null)
    if (tool !== 'select') setSelectedAnnotationId(null)
  }

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!scene) return
    event.preventDefault()
    const screenPoint = pointerCanvasPoint(event)

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

    const bounds = engine.commonBounds()
    const mapPoint = canvasPointToMap(
      screenPoint.x,
      screenPoint.y,
      bounds,
      settings,
    )

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

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const screenPoint = pointerCanvasPoint(event)
    if (figureElementDragRef.current) {
      moveFigureElementDrag(screenPoint)
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
    setAnnotations((current) =>
      current.filter(
        (annotation) => annotation.id !== selectedAnnotationId,
      ),
    )
    setSelectedAnnotationId(null)
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
    setAnnotationDefaults(DEFAULT_ANNOTATION_SETTINGS)
    figureElementDragRef.current = null
    elementBoundsRef.current = []
    setElementDragging(false)
    setHoveredElement(null)
    setActiveElement('title')
    setScene(null)
    setNotices([])
    setExistingRun(0)
    setProposedRun(0)
    setSettings(cloneDefaultSettings())
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
    const project = {
      version: 6,
      figure: 'fra-wse-difference',
      settings,
      overlays,
      annotations,
      annotationDefaults,
      selectedRuns: { existingRun, proposedRun },
    }
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
      const project = JSON.parse(await file.text()) as {
        settings?: Omit<Partial<FigureSettings>, 'elementStyles'> & {
          contourColor?: string
          showContours?: boolean
          elementStyles?: {
            title?: Partial<MapElementStyles['title']>
            diffLegend?: Partial<MapElementStyles['diffLegend']>
            wetDry?: Partial<MapElementStyles['wetDry']>
            north?: Partial<MapElementStyles['north']>
            scale?: Partial<MapElementStyles['scale']>
          }
        }
        overlays?: MapOverlay[]
        annotations?: Array<
          | MapAnnotation
          | (Omit<MapAnnotation, 'kind'> & { kind: 'marker' })
        >
        annotationDefaults?: Partial<AnnotationDefaults>
        selectedRuns?: { existingRun?: number; proposedRun?: number }
      }
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
        setAnnotations(
          project.annotations.filter(
            (annotation): annotation is MapAnnotation =>
              annotation.kind !== 'marker',
          ),
        )
      }
      if (project.annotationDefaults) {
        setAnnotationDefaults((current) => ({
          ...current,
          ...project.annotationDefaults,
        }))
      }
      setSelectedAnnotationId(null)
      setAnnotationStart(null)
      setExistingRun(project.selectedRuns?.existingRun ?? 0)
      setProposedRun(project.selectedRuns?.proposedRun ?? 0)
      setScene(null)
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
            onClick={() => setLeftOpen(true)}
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

      <main className="workspace">
        <aside className={`sidebar left-sidebar${leftOpen ? ' is-mobile-open' : ''}`}>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Inputs</span>
              <h2>Project data</h2>
            </div>
            <button
              className="icon-button mobile-close"
              type="button"
              title="Close project data"
              aria-label="Close project data"
              onClick={() => setLeftOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <section className="sidebar-block">
            <div className="block-title">
              <UploadCloud size={17} aria-hidden="true" />
              <span>SMS mesh and results</span>
              <span className="file-chip">.h5</span>
            </div>
            <FileDrop
              accept=".h5"
              title="Add geometry + datasets"
              description="Existing and Proposed, any order"
              disabled={busy}
              testId="h5-file-drop"
              onFiles={handleH5Files}
            />
            <div className="condition-list">
              <ConditionStatus
                label="Existing"
                conditionKey="EX"
                geometryName={existingCondition?.geometryFileName}
                datasetName={existingCondition?.datasetFileName}
                nodeCount={existingCondition?.projected?.N}
                runCount={existingCondition?.datasets?.runs.length}
              />
              <ConditionStatus
                label="Proposed"
                conditionKey="PR"
                geometryName={proposedCondition?.geometryFileName}
                datasetName={proposedCondition?.datasetFileName}
                nodeCount={proposedCondition?.projected?.N}
                runCount={proposedCondition?.datasets?.runs.length}
              />
            </div>
          </section>

          <section className="sidebar-block">
            <div className="block-title">
              <RefreshCcw size={17} aria-hidden="true" />
              <span>Run pairing</span>
            </div>
            <label className="field">
              <span>Existing run</span>
              <select
                value={existingRun}
                disabled={existingRuns.length === 0}
                onChange={(event) => {
                  setExistingRun(Number(event.target.value))
                  setScene(null)
                }}
              >
                {existingRuns.length === 0 ? (
                  <option>Waiting for Existing files</option>
                ) : (
                  existingRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>Proposed run</span>
              <select
                value={proposedRun}
                disabled={proposedRuns.length === 0}
                onChange={(event) => {
                  setProposedRun(Number(event.target.value))
                  setScene(null)
                }}
              >
                {proposedRuns.length === 0 ? (
                  <option>Waiting for Proposed files</option>
                ) : (
                  proposedRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </section>

          <section className="sidebar-block overlay-block">
            <div className="block-title">
              <Layers3 size={17} aria-hidden="true" />
              <span>Map overlays</span>
              <span className="file-chip">.zip</span>
            </div>
            <FileDrop
              accept=".zip"
              title="Add zipped shapefiles"
              description="Centerlines, ROW, project limits"
              disabled={busy}
              testId="overlay-file-drop"
              onFiles={handleOverlayFiles}
            />
            {overlays.length > 0 ? (
              <Toggle
                label="Show shapefile overlays"
                checked={settings.showOverlays}
                onChange={(checked) =>
                  updateSettings('showOverlays', checked)
                }
              />
            ) : null}
            {overlays.length === 0 ? (
              <p className="empty-note">No shapefile overlays loaded.</p>
            ) : (
              <div className="overlay-list">
                {overlays.map((overlay) => (
                  <div className="overlay-row" key={overlay.id}>
                    <label className="overlay-visible">
                      <input
                        type="checkbox"
                        checked={overlay.visible}
                        onChange={(event) =>
                          updateOverlay(overlay.id, {
                            visible: event.target.checked,
                          })
                        }
                      />
                      <span title={overlay.name}>{overlay.name}</span>
                    </label>
                    <input
                      type="color"
                      value={overlay.color}
                      aria-label={`${overlay.name} color`}
                      onChange={(event) =>
                        updateOverlay(overlay.id, { color: event.target.value })
                      }
                    />
                    <input
                      className="width-input"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={overlay.width}
                      aria-label={`${overlay.name} line width`}
                      onChange={(event) =>
                        updateOverlay(overlay.id, {
                          width: numeric(event.target.value, 3),
                        })
                      }
                    />
                    <button
                      className="icon-button small danger"
                      type="button"
                      title={`Remove ${overlay.name}`}
                      aria-label={`Remove ${overlay.name}`}
                      onClick={() =>
                        setOverlays((current) =>
                          current.filter((item) => item.id !== overlay.id),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button className="text-button reset-project" type="button" onClick={resetProject}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset project
          </button>
        </aside>

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
            <ControlSection
              icon={<Settings2 size={17} />}
              title="Map calculation"
              badge="FRA"
            >
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
                      numeric(event.target.value, DEFAULT_SETTINGS.dryDepth),
                    )
                    setScene(null)
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
            <ControlSection
              icon={<Palette size={17} />}
              title="Legend and colors"
            >
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
            <ControlSection
              icon={<SlidersHorizontal size={17} />}
              title="Frame and view"
            >
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
            <ControlSection
              icon={<MapPin size={17} />}
              title="Figure elements"
            >
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
            <ControlSection
              icon={<MessageSquareText size={17} />}
              title="Annotations and callouts"
            >
              <div className="extrema-callout-card">
                <div className="extrema-callout-heading">
                  <Crosshair size={17} aria-hidden="true" />
                  <strong>Maximum WSE change</strong>
                </div>
                <div className="extrema-values">
                  <div className="extrema-value rise">
                    <ArrowUp size={15} aria-hidden="true" />
                    <span>Rise</span>
                    <strong>
                      {wseExtrema?.rise
                        ? `+${wseExtrema.rise.value.toFixed(2)} ft`
                        : 'None'}
                    </strong>
                  </div>
                  <div className="extrema-value reduction">
                    <ArrowDown size={15} aria-hidden="true" />
                    <span>Reduction</span>
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
                  <Crosshair size={15} aria-hidden="true" />
                  {extremaCalloutCount > 0
                    ? 'Refresh max WSE callouts'
                    : 'Add max WSE callouts'}
                </button>
              </div>

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
                      <ToolIcon size={18} aria-hidden="true" />
                      <span>{tool.label}</span>
                    </button>
                  )
                })}
              </div>

              <p
                className={`annotation-guidance${annotationStart ? ' awaiting-point' : ''}`}
                aria-live="polite"
              >
                {selectedAnnotation?.hydraulicExtremum &&
                annotationTool === 'select'
                  ? 'Drag the label to reposition it; its computed target stays fixed'
                  : annotationGuidance(
                      annotationTool,
                      Boolean(annotationStart),
                    )}
              </p>

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

              {(annotationTool === 'text' ||
                annotationTool === 'leader' ||
                (selectedAnnotation &&
                  !selectedAnnotation.hydraulicExtremum &&
                  selectedAnnotation.kind !== 'line' &&
                  selectedAnnotation.kind !== 'arrow' &&
                  selectedAnnotation.kind !== 'result')) ? (
                <label className="field">
                  <span>
                    {selectedAnnotation ? 'Selected text' : 'New annotation text'}
                  </span>
                  <textarea
                    className="annotation-textarea"
                    rows={3}
                    value={annotationEditor.text}
                    onChange={(event) =>
                      updateAnnotationAppearance({ text: event.target.value })
                    }
                  />
                </label>
              ) : null}

              {annotationTool === 'result' ||
              (selectedAnnotation?.kind === 'result' &&
                !selectedAnnotation.hydraulicExtremum) ? (
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

              <div className="annotation-style-heading">
                <span>{selectedAnnotation ? 'Selected style' : 'New item style'}</span>
                {selectedAnnotation ? (
                  <span className="annotation-selected-kind">
                    {selectedAnnotation.hydraulicExtremum
                      ? extremumDisplayName(
                          selectedAnnotation.hydraulicExtremum,
                        )
                      : selectedAnnotation.kind}
                  </span>
                ) : null}
              </div>

              <div className="field-grid two">
                <label className="field color-field">
                  <span>Color</span>
                  <input
                    type="color"
                    value={annotationEditor.color}
                    onChange={(event) =>
                      updateAnnotationAppearance({ color: event.target.value })
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
              <Toggle
                label="Dashed line"
                checked={annotationEditor.dashed}
                onChange={(checked) =>
                  updateAnnotationAppearance({ dashed: checked })
                }
              />
              <Toggle
                label="Text background"
                checked={annotationEditor.background}
                onChange={(checked) =>
                  updateAnnotationAppearance({ background: checked })
                }
              />

              {selectedAnnotation ? (
                <div className="annotation-selection-actions">
                  <div className="nudge-control">
                    <span>Move selected</span>
                    <div className="nudge-buttons">
                      <NudgeButton
                        label="Move annotation left"
                        icon={<ArrowLeft size={14} />}
                        onClick={() => nudgeSelectedAnnotation(-10, 0)}
                      />
                      <NudgeButton
                        label="Move annotation up"
                        icon={<ArrowUp size={14} />}
                        onClick={() => nudgeSelectedAnnotation(0, -10)}
                      />
                      <NudgeButton
                        label="Move annotation down"
                        icon={<ArrowDown size={14} />}
                        onClick={() => nudgeSelectedAnnotation(0, 10)}
                      />
                      <NudgeButton
                        label="Move annotation right"
                        icon={<ArrowRight size={14} />}
                        onClick={() => nudgeSelectedAnnotation(10, 0)}
                      />
                    </div>
                  </div>
                  <button
                    className="button danger-outline compact full"
                    type="button"
                    onClick={deleteSelectedAnnotation}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete selected
                  </button>
                </div>
              ) : null}

              <div className="annotation-list-heading">
                <span>Placed annotations</span>
                <span>{annotations.length}</span>
              </div>
              {annotations.length === 0 ? (
                <p className="empty-note">No annotations placed yet.</p>
              ) : (
                <div className="annotation-list">
                  {annotations.map((annotation, index) => (
                    <button
                      className={`annotation-list-item${annotation.id === selectedAnnotationId ? ' active' : ''}`}
                      type="button"
                      key={annotation.id}
                      onClick={() => {
                        setAnnotationTool('select')
                        setAnnotationStart(null)
                        setSelectedAnnotationId(annotation.id)
                      }}
                    >
                      <span>
                        {annotation.hydraulicExtremum
                          ? extremumDisplayName(
                              annotation.hydraulicExtremum,
                            )
                          : `${annotation.kind.charAt(0).toUpperCase()}${annotation.kind.slice(1)} ${index + 1}`}
                      </span>
                      <small>
                        {annotation.text.split(/\r?\n/)[0] || 'Untitled'}
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {annotations.length > 0 ? (
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
              ) : null}
            </ControlSection>
            ) : null}

            {activeSettingsSection === 'export' ? (
            <ControlSection
              icon={<ImageDown size={17} />}
              title="Export"
            >
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

type ConditionStatusProps = {
  label: string
  conditionKey: ConditionKey
  geometryName?: string
  datasetName?: string
  nodeCount?: number
  runCount?: number
}

function ConditionStatus({
  label,
  conditionKey,
  geometryName,
  datasetName,
  nodeCount,
  runCount,
}: ConditionStatusProps) {
  const complete = Boolean(geometryName && datasetName)
  return (
    <div className={`condition-row${complete ? ' complete' : ''}`}>
      <div className="condition-name">
        <span className={`condition-code ${conditionKey.toLowerCase()}`}>
          {conditionKey}
        </span>
        <strong>{label}</strong>
      </div>
      <div className="condition-badges">
        <span
          className={geometryName ? 'status-badge ready' : 'status-badge'}
          title={geometryName}
        >
          {geometryName ? `${nodeCount?.toLocaleString()} nodes` : 'geometry'}
        </span>
        <span
          className={datasetName ? 'status-badge ready' : 'status-badge'}
          title={datasetName}
        >
          {datasetName ? `${runCount} runs` : 'datasets'}
        </span>
      </div>
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
