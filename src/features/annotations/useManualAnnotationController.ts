import {
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type {
  AnnotationDefaults,
  AnnotationTool,
  Bounds,
  FigureSettings,
  MapAnnotation,
  MapCoordinate,
  ResultLabelField,
} from '../../core/types'
import { useEditorCommandHistory } from '../editor-history/useEditorCommandHistory'
import { useFigureObjectKeyboard } from '../figure-objects/useFigureObjectKeyboard'
import { updateAnnotation } from './annotationCollection'
import {
  defaultAnnotationEditorView,
  duplicateSelectedAnnotation,
  nudgeSelectedAnnotationCommand,
  removeSelectedAnnotation,
  reorderSelectedAnnotation,
} from './annotationEditorOperations'
import type {
  AnnotationEditorView,
  AnnotationPanelActions,
  AnnotationPanelModel,
  AnnotationPanelView,
  AnnotationPlacedView,
} from './annotationEditorTypes'
import {
  isAnchoredMapCallout,
  resetMapAnnotationPositionCommand,
  setMapAnnotationLockedCommand,
  setMapCalloutLeaderVisibleCommand,
} from './mapAnnotationManipulation'
import {
  MANUAL_ANNOTATION_TOOLS,
  type AnnotationToolModule,
} from './annotationTools'
import { useAnnotationNavigation } from './useAnnotationNavigation'

type StateSetter<Value> = Dispatch<SetStateAction<Value>>

type Options = {
  bounds: Bounds
  settings: FigureSettings
  sceneReady: boolean
  annotations: MapAnnotation[]
  annotationDefaults: AnnotationDefaults
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
  tools?: readonly AnnotationToolModule[]
  keyboardEnabled?: boolean
  duplicateAnnotation?: (
    selected: MapAnnotation,
    selectedIndex: number,
    id: string,
  ) => MapAnnotation
  defaultPosition?: (selected: MapAnnotation) => readonly MapCoordinate[] | undefined
  onSetResultField?: (field: ResultLabelField) => void
  onAddExtremaCallouts?: () => void
  modelExtension?: Partial<AnnotationPanelModel>
}

export function useManualAnnotationController(options: Options) {
  const {
    bounds,
    settings,
    sceneReady,
    annotations,
    annotationDefaults,
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
    tools = MANUAL_ANNOTATION_TOOLS,
    keyboardEnabled = true,
  } = options
  const listItemRefs = useRef(new Map<string, HTMLButtonElement>())
  const selected = annotations.find((item) => item.id === selectedId) ?? null
  const selectedIndex = selected
    ? annotations.findIndex((item) => item.id === selected.id)
    : -1
  const editor = selected ?? annotationDefaults
  const activeResultField = selected?.kind === 'result'
    ? (selected.resultField ?? annotationDefaults.resultField)
    : annotationDefaults.resultField
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
  const history = useEditorCommandHistory({
    value: annotations,
    onChange: setAnnotations,
  })

  useEffect(() => {
    if (panelView === 'placed' && placedView === 'detail' && !selected) {
      setPlacedView('list')
    }
  }, [panelView, placedView, selected, setPlacedView])

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
      ...(kind === 'leader' || kind === 'result'
        ? {
            defaultPoints: points.map((point) => ({ ...point })),
            locked: false,
            leaderVisible: true,
          }
        : {}),
      text,
      color: annotationDefaults.color,
      fillColor: annotationDefaults.fillColor,
      lineWidth: annotationDefaults.lineWidth,
      fontSize: annotationDefaults.fontSize,
      rotation: annotationDefaults.rotation,
      dashed: annotationDefaults.dashed,
      background: kind === 'text'
        ? annotationDefaults.background
        : kind === 'leader' || kind === 'result',
      resultField,
    }
    history.execute({
      label: `add ${kind} annotation`,
      apply: (current) => [...current, annotation],
    })
    setSelectedId(id)
    setTool('select')
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView(defaultAnnotationEditorView(annotation))
    return annotation
  }

  const updateAppearance = (patch: Partial<AnnotationDefaults>) => {
    if (selectedId) {
      history.execute({
        label: 'edit annotation style',
        mergeKey: `appearance:${selectedId}`,
        apply: (current) => updateAnnotation(current, selectedId, patch),
      })
    } else {
      setAnnotationDefaults((current) => ({ ...current, ...patch }))
    }
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const result = removeSelectedAnnotation(annotations, selectedId, selected)
    history.execute({ label: 'delete annotation', apply: () => result.annotations })
    setSelectedId(result.selectedId)
    if (!result.selectedId) setPlacedView('list')
  }

  const duplicateSelected = () => {
    if (!selected) return
    const id = globalThis.crypto.randomUUID()
    const copy = options.duplicateAnnotation
      ? options.duplicateAnnotation(selected, selectedIndex, id)
      : duplicateSelectedAnnotation({ selected, selectedIndex, id, bounds, settings })
    history.execute({ label: 'duplicate annotation', apply: (current) => [...current, copy] })
    setSelectedId(id)
    setTool('select')
    setPanelView('placed')
    setPlacedView('detail')
    setEditorView(defaultAnnotationEditorView(copy))
    setAnnotationStart(null)
  }

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selected) return
    const command = nudgeSelectedAnnotationCommand({
      selected,
      dx,
      dy,
      bounds,
      settings,
    })
    if (command) history.execute(command)
  }

  const resetSelectedPosition = () => {
    if (!selected || selected.locked) return
    const points = options.defaultPosition?.(selected) ?? selected.defaultPoints
    if (!points) return
    history.execute(resetMapAnnotationPositionCommand({ id: selected.id, points }))
  }

  const reorderSelected = (direction: -1 | 1) => {
    if (!selected) return
    const targetIndex = selectedIndex + direction
    if (targetIndex < 0 || targetIndex >= annotations.length) return
    history.execute({
      label: direction > 0 ? 'bring annotation forward' : 'send annotation backward',
      apply: (current) => reorderSelectedAnnotation(current, selected.id, direction),
    })
  }

  const undo = () => {
    const restored = history.undo()
    if (restored && selectedId && !restored.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }
  const redo = () => {
    const restored = history.redo()
    if (restored && selectedId && !restored.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }

  useFigureObjectKeyboard({
    enabled: keyboardEnabled,
    hasSelection: Boolean(selectedId),
    onCancel: () => {
      setAnnotationStart(null)
      setTool('select')
    },
    onDelete: deleteSelected,
    onNudge: nudgeSelected,
    onUndo: undo,
    onRedo: redo,
  })

  const actions: AnnotationPanelActions = {
    choosePanelView: navigation.choosePanelView,
    handlePanelTabKeyDown: navigation.handlePanelTabKeyDown,
    chooseTool: navigation.chooseTool,
    cancelDrawing: () => setAnnotationStart(null),
    addExtremaCallouts: options.onAddExtremaCallouts ?? (() => undefined),
    updateAppearance,
    setResultField: (field) => {
      setAnnotationDefaults((current) => ({ ...current, resultField: field }))
      options.onSetResultField?.(field)
    },
    selectPlaced: navigation.selectPlaced,
    handleListKeyDown: navigation.handleListKeyDown,
    clearAnnotations: () => {
      history.execute({ label: 'clear annotations', apply: () => [] })
      setSelectedId(null)
      setAnnotationStart(null)
    },
    returnToList: navigation.returnToList,
    selectAdjacent: navigation.selectAdjacent,
    setEditorView,
    handleEditorTabKeyDown: navigation.handleEditorTabKeyDown,
    nudgeSelected,
    setSelectedVisible: (visible) => {
      if (!selected) return
      history.execute({
        label: visible ? 'show annotation' : 'hide annotation',
        apply: (current) => current.map((annotation) =>
          annotation.id === selected.id
            ? { ...annotation, visible }
            : annotation,
        ),
      })
    },
    setSelectedLocked: (locked) => {
      if (selected && (selected.kind === 'text' || isAnchoredMapCallout(selected))) {
        history.execute(setMapAnnotationLockedCommand({ id: selected.id, locked }))
      }
    },
    setSelectedLeaderVisible: (visible) => {
      if (selected && isAnchoredMapCallout(selected)) {
        history.execute(setMapCalloutLeaderVisibleCommand({ id: selected.id, visible }))
      }
    },
    resetSelectedPosition,
    duplicateSelected,
    sendSelectedBackward: () => reorderSelected(-1),
    bringSelectedForward: () => reorderSelected(1),
    deleteSelected,
    undo,
    redo,
  }
  const model: AnnotationPanelModel = {
    annotations,
    panelView,
    placedView,
    editorView,
    tool,
    tools,
    drawing,
    sceneReady,
    editor,
    selectedId,
    selected,
    selectedIndex,
    listItemRefs,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoLabel: history.undoLabel,
    redoLabel: history.redoLabel,
    activeResultField,
    resultLabelOptions: [],
    ...options.modelExtension,
  }

  return {
    model,
    actions,
    createAnnotation,
    commitAnnotationChange: (
      before: MapAnnotation[],
      after: MapAnnotation[],
      label: string,
    ) => history.commit({ before, after, label }),
    selectPlacedAnnotation: navigation.selectPlaced,
    clearHistory: history.clear,
  }
}
