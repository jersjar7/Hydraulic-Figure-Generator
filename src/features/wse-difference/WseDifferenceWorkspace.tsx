import {
  AlertCircle,
  Download,
  FileJson,
  Map,
  MapPin,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import '../../App.css'
import { ControlSection } from '../../components/ControlSection'
import { FigureEditorShell } from '../../components/editor/FigureEditorShell'
import { FigureMapWorkspace } from '../../components/editor/FigureMapWorkspace'
import { FigureSettingsSidebar } from '../../components/editor/FigureSettingsSidebar'
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
  type SettingsSectionKey,
} from './workspaceConfiguration'
import { useFittedCanvasSize } from './useFittedCanvasSize'
import { useWseEditorUi } from './useWseEditorUi'
import { useWseMapRendering } from './useWseMapRendering'
import { useWseMapInteractions } from './useWseMapInteractions'
import { useWseFigureDocument } from './useWseFigureDocument'
import {
  annotationHasContentEditor,
  defaultEditorView,
  defaultExtremumLabelPoint,
} from './workspaceInteractions'

const ACTIVE_FIGURE = wseDifferenceFigure

export function WseDifferenceWorkspace() {
  const projectSession = useProjectSession()
  const figureDocument = useWseFigureDocument()
  const editorUi = useWseEditorUi()
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
  const {
    annotationTool,
    annotationPanelView,
    annotationPlacedView,
    annotationEditorView,
    selectedAnnotationId,
    annotationStart,
    annotationDragging,
    assessmentCalloutDragging,
    stationLabelDragging,
    notices,
    busy,
    leftOpen,
    leftCollapsed,
    rightOpen,
    activeSettingsSection,
    activeElement,
    selectedStationLabelId,
    hoveredElement,
    elementDragging,
    setAnnotationTool,
    setAnnotationPanelView,
    setAnnotationPlacedView,
    setAnnotationEditorView,
    setSelectedAnnotationId,
    setAnnotationStart,
    setAnnotationDragging,
    setAssessmentCalloutDragging,
    setStationLabelDragging,
    setNotices,
    setBusy,
    setLeftOpen,
    setLeftCollapsed,
    setRightOpen,
    setActiveSettingsSection,
    setActiveElement,
    setSelectedStationLabelId,
    setHoveredElement,
    setElementDragging,
  } = editorUi
  const [scene, setScene] = useState<WseDifferenceScene | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const canvasDisplaySize = useFittedCanvasSize(
    canvasFrameRef,
    settings.orientation,
  )
  const projectInputRef = useRef<HTMLInputElement>(null)
  const annotationListItemRefs = useRef(
    new globalThis.Map<string, HTMLButtonElement>(),
  )
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
  }, [
    centerlineStationTicks,
    selectedStationLabelId,
    setSelectedStationLabelId,
  ])

  useEffect(() => {
    if (
      annotationPanelView === 'placed' &&
      annotationPlacedView === 'detail' &&
      !selectedAnnotation
    ) {
      setAnnotationPlacedView('list')
    }
  }, [
    annotationPanelView,
    annotationPlacedView,
    selectedAnnotation,
    setAnnotationPlacedView,
  ])

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    setNotices((current) => [...current, ...incoming].slice(-40))
  }, [setNotices])

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
  }, [
    selectedAnnotationId,
    setAnnotations,
    setAnnotationStart,
    setAnnotationTool,
    setSelectedAnnotationId,
  ])

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

  const mapInteractions = useWseMapInteractions({
    scene,
    engine,
    settings,
    elementBoundsRef,
    activeSettingsSection,
    annotationTool,
    annotations,
    annotationStart,
    annotationDefaults,
    centerlineStationLayer,
    assessmentDisplayLayer,
    stationedAssessmentLines,
    assessmentReviewOpen: assessmentState.panelView === 'review',
    assessmentOverrides: assessmentState.overrides,
    setAnnotations,
    setAnnotationStart,
    setSelectedAnnotationId,
    showPlacedAnnotation: selectPlacedAnnotation,
    createAnnotation,
    appendNotices,
    setAnnotationDragging,
    selectFigureElement: (key) => setActiveElement(key),
    updateElementPosition,
    setElementDragging,
    setHoveredElement,
    selectStationLabel: (id) => {
      setActiveSettingsSection('elements')
      setActiveElement('stationing')
      setSelectedStationLabelId(id)
      setRightOpen(true)
    },
    updateStationLabelOverride,
    setStationLabelDragging,
    selectAssessmentLine: assessmentWorkflow.selectLine,
    selectAssessmentStatus: assessmentWorkflow.setReviewTab,
    updateAssessmentOverride: assessmentWorkflow.setOverride,
    setAssessmentCalloutDragging,
    openAssessmentReview: () => {
      assessmentWorkflow.openReview()
      setLeftCollapsed(false)
      setLeftOpen(true)
    },
  })

  const resetProject = () => {
    mapInteractions.resetInteractions()
    projectSession.reset()
    resetDocument()
    setSelectedAnnotationId(null)
    setAnnotationStart(null)
    setAnnotationTool('select')
    setAnnotationPanelView('create')
    setAnnotationPlacedView('list')
    setAnnotationEditorView('content')
    setLeftCollapsed(false)
    setSelectedStationLabelId(null)
    elementBoundsRef.current = []
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
    <FigureEditorShell
      workspaceLabel={ACTIVE_FIGURE.workspaceLabel}
      figureLabel={ACTIVE_FIGURE.label}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
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
      loadInput={
          <input
            ref={projectInputRef}
            className="visually-hidden"
            type="file"
            accept=".hydfig,.json"
            onChange={loadProject}
          />
      }
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

        <FigureMapWorkspace
          figureLabel={ACTIVE_FIGURE.label}
          comparisonDescription={`${comparisonLabel} minus ${baselineLabel}`}
          busy={busy}
          notices={notices}
          onZoomOut={() =>
            updateSettings('zoom', Math.max(0.35, settings.zoom - 0.1))
          }
          onZoomIn={() =>
            updateSettings('zoom', Math.min(4, settings.zoom + 0.1))
          }
          onFitFrame={resetView}
        >
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
                onPointerDown={mapInteractions.handlePointerDown}
                onPointerMove={mapInteractions.handlePointerMove}
                onPointerUp={mapInteractions.handlePointerUp}
                onPointerCancel={mapInteractions.handlePointerCancel}
                onPointerLeave={() => {
                  if (!elementDragging) setHoveredElement(null)
                }}
                style={{
                  width: canvasDisplaySize.width || undefined,
                  height: canvasDisplaySize.height || undefined,
                }}
              />
            </div>
        </FigureMapWorkspace>

        <FigureSettingsSidebar<SettingsSectionKey>
          mobileOpen={rightOpen}
          sections={SETTINGS_SECTIONS}
          activeSection={activeSettingsSection}
          onSectionChange={setActiveSettingsSection}
          onSectionKeyDown={handleSettingsTabKeyDown}
          onMobileClose={() => setRightOpen(false)}
          footer={
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
          }
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
        </FigureSettingsSidebar>
    </FigureEditorShell>
  )
}
