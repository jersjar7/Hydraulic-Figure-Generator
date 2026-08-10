import {
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  formatWseExtremumLabel,
  type HydraulicEngine,
} from '../../core/hydraulicEngine'
import { detectWseDifferenceExtrema } from '../../application/hydraulics/detectWseDifferenceExtrema'
import {
  formatHydraulicResultLabel,
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
import { defaultEditorView } from './workspaceInteractions'
import { useAnnotationNavigation } from './useAnnotationNavigation'
import {
  synchronizeWseExtremaAnnotations,
  upsertWseExtremaCallouts,
} from './wseExtremaAnnotations'
import {
  updateAnnotation,
} from '../annotations/annotationCollection'
import { useEditorCommandHistory } from '../editor-history/useEditorCommandHistory'
import {
  reorderSelectedAnnotation,
} from '../annotations/annotationEditorOperations'
import {
  isAnchoredMapCallout,
  resetMapAnnotationPositionCommand,
  setMapAnnotationLockedCommand,
  setMapCalloutLeaderVisibleCommand,
} from '../annotations/mapAnnotationManipulation'
import { useFigureObjectKeyboard } from '../figure-objects/useFigureObjectKeyboard'
import {
  defaultWseAnnotationPosition,
  duplicateSelectedWseAnnotation,
  nudgeSelectedWseAnnotationCommand,
  removeSelectedWseAnnotation,
} from './wseAnnotationSelectionOperations'
import { WSE_ANNOTATION_TOOLS } from './annotationTools'

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
  keyboardEnabled?: boolean
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
  keyboardEnabled = true,
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
    () => (scene ? detectWseDifferenceExtrema(scene) : null),
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
    commit: commitAnnotationHistory,
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
    const result = removeSelectedWseAnnotation(
      annotations,
      selectedId,
      selected,
    )
    executeAnnotationCommand({
      label: 'delete annotation',
      apply: () => result.annotations,
    })
    setSelectedId(result.selectedId)
    if (!result.selectedId) setPlacedView('list')
  }

  const duplicateSelected = () => {
    if (!selected) return
    const bounds = engine.commonBounds()
    const id = globalThis.crypto.randomUUID()
    const copy = duplicateSelectedWseAnnotation({
      selected,
      selectedIndex,
      id,
      bounds,
      settings,
      scene,
      engine,
    })
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
    if (!selected) return
    const bounds = engine.commonBounds()
    const command = nudgeSelectedWseAnnotationCommand({
      selected,
      dx,
      dy,
      bounds,
      settings,
    })
    if (command) executeAnnotationCommand(command)
  }

  const setSelectedLocked = (locked: boolean) => {
    if (
      !selected ||
      (selected.kind !== 'text' && !isAnchoredMapCallout(selected))
    ) {
      return
    }
    executeAnnotationCommand(
      setMapAnnotationLockedCommand({ id: selected.id, locked }),
    )
  }

  const setSelectedVisible = (visible: boolean) => {
    if (!selected) return
    executeAnnotationCommand({
      label: visible ? 'show annotation' : 'hide annotation',
      apply: (current) => current.map((annotation) =>
        annotation.id === selected.id
          ? { ...annotation, visible }
          : annotation,
      ),
    })
  }

  const reorderSelected = (direction: -1 | 1) => {
    if (!selected) return
    executeAnnotationCommand({
      label: direction > 0 ? 'bring annotation forward' : 'send annotation backward',
      apply: (current) => reorderSelectedAnnotation(current, selected.id, direction),
    })
  }

  const setSelectedLeaderVisible = (visible: boolean) => {
    if (!selected || !isAnchoredMapCallout(selected)) return
    executeAnnotationCommand(
      setMapCalloutLeaderVisibleCommand({ id: selected.id, visible }),
    )
  }

  const resetSelectedPosition = () => {
    if (!selected || selected.locked) return
    const points = defaultWseAnnotationPosition({
      selected,
      extrema,
      bounds: engine.commonBounds(),
      settings,
    })
    if (!points) return
    executeAnnotationCommand(
      resetMapAnnotationPositionCommand({
        id: selected.id,
        points,
      }),
    )
  }

  const clearAnnotations = () => {
    executeAnnotationCommand({
      label: 'clear annotations',
      apply: () => [],
    })
    setSelectedId(null)
    setAnnotationStart(null)
  }

  const undo = () => {
    const restored = undoAnnotationCommand()
    if (
      restored &&
      selectedId &&
      !restored.some((annotation) => annotation.id === selectedId)
    ) {
      setSelectedId(null)
    }
  }

  const redo = () => {
    const restored = redoAnnotationCommand()
    if (
      restored &&
      selectedId &&
      !restored.some((annotation) => annotation.id === selectedId)
    ) {
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

  const model: AnnotationPanelModel = {
    annotations,
    panelView,
    placedView,
    editorView,
    tool,
    tools: WSE_ANNOTATION_TOOLS,
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
    setSelectedVisible,
    setSelectedLocked,
    setSelectedLeaderVisible,
    resetSelectedPosition,
    duplicateSelected,
    sendSelectedBackward: () => reorderSelected(-1),
    bringSelectedForward: () => reorderSelected(1),
    deleteSelected,
    undo,
    redo,
  }

  return {
    model,
    actions,
    createAnnotation,
    commitAnnotationChange: (
      before: MapAnnotation[],
      after: MapAnnotation[],
      label: string,
    ) => commitAnnotationHistory({ before, after, label }),
    selectPlacedAnnotation: navigation.selectPlaced,
  }
}
