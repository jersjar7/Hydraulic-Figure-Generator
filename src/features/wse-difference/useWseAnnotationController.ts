import {
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  findWseDifferenceExtrema,
  formatWseExtremumLabel,
  type HydraulicEngine,
} from '../../core/hydraulicEngine'
import {
  canvasPointToMap,
  duplicateAnnotation,
  formatHydraulicResultLabel,
  FRAMES,
  sampleHydraulicResult,
} from '../../core/mapRenderer'
import type {
  AnnotationDefaults,
  AnnotationTool,
  FigureSettings,
  IngestNotice,
  MapAnnotation,
  MapCoordinate,
  ResultLabelField,
  WseDifferenceScene,
} from '../../core/types'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from './annotationPanelTypes'
import type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
} from './workspaceConfiguration'
import {
  defaultEditorView,
} from './workspaceInteractions'
import { useAnnotationNavigation } from './useAnnotationNavigation'
import {
  synchronizeWseExtremaAnnotations,
  upsertWseExtremaCallouts,
} from './wseExtremaAnnotations'
import {
  removeAnnotation,
  translateAnnotation,
  updateAnnotation,
} from '../annotations/annotationCollection'
import { useEditorCommandHistory } from '../editor-history/useEditorCommandHistory'

type StateSetter<Value> = Dispatch<SetStateAction<Value>>

type WseAnnotationControllerOptions = {
  scene: WseDifferenceScene | null
  engine: HydraulicEngine
  settings: FigureSettings
  annotations: MapAnnotation[]
  annotationDefaults: AnnotationDefaults
  baselineLabel: string
  comparisonLabel: string
  panelView: AnnotationPanelView
  placedView: AnnotationPlacedView
  editorView: AnnotationEditorView
  tool: AnnotationTool
  drawing: boolean
  selectedId: string | null
  setAnnotations: StateSetter<MapAnnotation[]>
  setAnnotationDefaults: StateSetter<AnnotationDefaults>
  setPanelView: StateSetter<AnnotationPanelView>
  setPlacedView: StateSetter<AnnotationPlacedView>
  setEditorView: StateSetter<AnnotationEditorView>
  setTool: StateSetter<AnnotationTool>
  setAnnotationStart: StateSetter<MapCoordinate | null>
  setSelectedId: StateSetter<string | null>
  appendNotices: (notices: IngestNotice[]) => void
}

export function useWseAnnotationController({
  scene,
  engine,
  settings,
  annotations,
  annotationDefaults,
  baselineLabel,
  comparisonLabel,
  panelView,
  placedView,
  editorView,
  tool,
  drawing,
  selectedId,
  setAnnotations,
  setAnnotationDefaults,
  setPanelView,
  setPlacedView,
  setEditorView,
  setTool,
  setAnnotationStart,
  setSelectedId,
  appendNotices,
}: WseAnnotationControllerOptions) {
  const listItemRefs = useRef(new Map<string, HTMLButtonElement>())
  const selected =
    annotations.find((annotation) => annotation.id === selectedId) ?? null
  const selectedIndex = selected
    ? annotations.findIndex((annotation) => annotation.id === selected.id)
    : -1
  const editor = selected ?? annotationDefaults
  const activeResultField =
    selected?.kind === 'result'
      ? (selected.resultField ?? annotationDefaults.resultField)
      : annotationDefaults.resultField
  const extrema = useMemo(
    () => (scene ? findWseDifferenceExtrema(scene) : null),
    [scene],
  )
  const extremaCalloutCount = annotations.filter(
    (annotation) => annotation.hydraulicExtremum,
  ).length
  const resultLabelOptions: AnnotationPanelModel['resultLabelOptions'] = [
    { value: 'summary', label: 'WSE summary' },
    { value: 'difference', label: 'WSE difference' },
    { value: 'existingWse', label: `${baselineLabel} WSE` },
    { value: 'proposedWse', label: `${comparisonLabel} WSE` },
    { value: 'existingDepth', label: `${baselineLabel} depth` },
    { value: 'proposedDepth', label: `${comparisonLabel} depth` },
  ]
  const navigation = useAnnotationNavigation({
    annotations,
    selected,
    selectedId,
    selectedIndex,
    editorView,
    listItemRefs,
    setPanelView,
    setPlacedView,
    setEditorView,
    setTool,
    setAnnotationStart,
    setSelectedId,
  })
  const {
    execute: executeAnnotationCommand,
    undo: undoAnnotationCommand,
    redo: redoAnnotationCommand,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useEditorCommandHistory({
    value: annotations,
    onChange: setAnnotations,
  })

  useEffect(() => {
    if (panelView === 'placed' && placedView === 'detail' && !selected) {
      setPlacedView('list')
    }
  }, [panelView, placedView, selected, setPlacedView])

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
    if (!extrema) return
    setAnnotations((current) =>
      synchronizeWseExtremaAnnotations(current, extrema),
    )
  }, [extrema, setAnnotations])

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
        setTool('select')
      }
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedId
      ) {
        executeAnnotationCommand({
          label: 'delete annotation',
          apply: (current) =>
            current.filter((annotation) => annotation.id !== selectedId),
        })
        setSelectedId(null)
      }
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoAnnotationCommand()
        else undoAnnotationCommand()
      } else if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoAnnotationCommand()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    executeAnnotationCommand,
    redoAnnotationCommand,
    selectedId,
    setAnnotationStart,
    setSelectedId,
    setTool,
    undoAnnotationCommand,
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
          : kind === 'leader' || kind === 'result',
      resultField,
    }
    executeAnnotationCommand({
      label: `add ${kind} annotation`,
      apply: (current) => [...current, annotation],
    })
    setSelectedId(id)
    setTool('select')
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView(defaultEditorView(annotation))
    return annotation
  }

  const addExtremaCallouts = () => {
    if (!scene || !extrema) return
    const updated = upsertWseExtremaCallouts({
      annotations,
      extrema,
      bounds: engine.commonBounds(),
      settings,
      defaults: annotationDefaults,
      createId: () => globalThis.crypto.randomUUID(),
    })
    const { available, ids } = updated
    if (available.length === 0) {
      appendNotices([
        {
          level: 'warning',
          text: 'No positive or negative WSE differences are available to label.',
        },
      ])
      return
    }
    executeAnnotationCommand({
      label: 'add result extrema',
      apply: () => updated.annotations,
    })

    setSelectedId(ids.get(available[0].kind) ?? null)
    setTool('select')
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView('content')
    setAnnotationStart(null)
    const summary = available
      .map((extremum) =>
        formatWseExtremumLabel(extremum.kind, extremum.value),
      )
      .join('; ')
    appendNotices([
      {
        level: 'success',
        text: `${extremaCalloutCount > 0 ? 'Refreshed' : 'Added'} ${summary}.`,
      },
      ...(available.length < 2
        ? [
            {
              level: 'warning' as const,
              text:
                extrema.rise === null
                  ? 'No positive WSE rise was found in the comparison.'
                  : 'No negative WSE reduction was found in the comparison.',
            },
          ]
        : []),
    ])
  }

  const updateAppearance = (patch: Partial<AnnotationDefaults>) => {
    if (selectedId) {
      executeAnnotationCommand({
        label: 'edit annotation style',
        mergeKey: `appearance:${selectedId}`,
        apply: (current) =>
          updateAnnotation(current, selectedId, patch),
      })
    } else {
      setAnnotationDefaults((current) => ({ ...current, ...patch }))
    }
  }

  const setResultField = (field: ResultLabelField) => {
    setAnnotationDefaults((current) => ({
      ...current,
      resultField: field,
    }))
    if (!selected || selected.kind !== 'result' || !scene) return
    const sample = sampleHydraulicResult(
      scene,
      engine.commonBounds(),
      settings,
      selected.points[0],
    )
    executeAnnotationCommand({
      label: 'change result label',
      apply: (current) =>
        current.map((annotation) =>
          annotation.id === selected.id
            ? {
                ...annotation,
                resultField: field,
                text: sample
                  ? formatHydraulicResultLabel(field, sample)
                  : annotation.text,
              }
            : annotation,
        ),
    })
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const result = removeAnnotation(annotations, selectedId)
    executeAnnotationCommand({
      label: 'delete annotation',
      apply: () => result.annotations,
    })
    setSelectedId(result.selectedId)
    if (!result.selectedId) setPlacedView('list')
  }

  const duplicateSelected = () => {
    if (!selected) return
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
      selected,
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
    executeAnnotationCommand({
      label: 'duplicate annotation',
      apply: (current) => [...current, copy],
    })
    setSelectedId(id)
    setTool('select')
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView(defaultEditorView(copy))
    setAnnotationStart(null)
  }

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedId) return
    const frame = FRAMES[settings.orientation]
    const bounds = engine.commonBounds()
    const center = canvasPointToMap(
      frame.width / 2,
      frame.height / 2,
      bounds,
      settings,
    )
    const offset = canvasPointToMap(
      frame.width / 2 + dx,
      frame.height / 2 + dy,
      bounds,
      settings,
    )
    executeAnnotationCommand({
      label: 'nudge annotation',
      apply: (current) =>
        current.map((annotation) =>
          annotation.id === selectedId
            ? translateAnnotation(
                annotation,
                offset.x - center.x,
                offset.y - center.y,
              )
            : annotation,
        ),
    })
  }

  const clearAnnotations = () => {
    executeAnnotationCommand({
      label: 'clear annotations',
      apply: () => [],
    })
    setSelectedId(null)
    setAnnotationStart(null)
  }

  const model: AnnotationPanelModel = {
    annotations,
    panelView,
    placedView,
    editorView,
    tool,
    drawing,
    sceneReady: Boolean(scene),
    extrema,
    extremaCalloutCount,
    baselineLabel,
    comparisonLabel,
    editor,
    activeResultField,
    resultLabelOptions,
    selectedId,
    selected,
    selectedIndex,
    listItemRefs,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  }
  const actions: AnnotationPanelActions = {
    choosePanelView: navigation.choosePanelView,
    handlePanelTabKeyDown: navigation.handlePanelTabKeyDown,
    chooseTool: navigation.chooseTool,
    cancelDrawing: () => setAnnotationStart(null),
    addExtremaCallouts,
    updateAppearance,
    setResultField,
    selectPlaced: navigation.selectPlaced,
    handleListKeyDown: navigation.handleListKeyDown,
    clearAnnotations,
    returnToList: navigation.returnToList,
    selectAdjacent: navigation.selectAdjacent,
    setEditorView,
    handleEditorTabKeyDown: navigation.handleEditorTabKeyDown,
    nudgeSelected,
    duplicateSelected,
    deleteSelected,
    undo: () => {
      const restored = undoAnnotationCommand()
      if (
        restored &&
        selectedId &&
        !restored.some((annotation) => annotation.id === selectedId)
      ) {
        setSelectedId(null)
      }
    },
    redo: () => {
      const restored = redoAnnotationCommand()
      if (
        restored &&
        selectedId &&
        !restored.some((annotation) => annotation.id === selectedId)
      ) {
        setSelectedId(null)
      }
    },
  }

  return {
    model,
    actions,
    createAnnotation,
    selectPlacedAnnotation: navigation.selectPlaced,
  }
}
