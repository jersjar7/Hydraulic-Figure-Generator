import type {
  KeyboardEvent,
  RefObject,
} from 'react'
import type { WseDifferenceExtremum } from '../../core/hydraulicEngine'
import type {
  AnnotationDefaults,
  AnnotationTool,
  MapAnnotation,
  ResultLabelField,
} from '../../core/types'
import type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
} from './workspaceConfiguration'

export type AnnotationAppearance = Pick<
  MapAnnotation,
  | 'text'
  | 'color'
  | 'fillColor'
  | 'lineWidth'
  | 'fontSize'
  | 'rotation'
  | 'dashed'
  | 'background'
>

export type AnnotationPanelModel = {
  annotations: MapAnnotation[]
  panelView: AnnotationPanelView
  placedView: AnnotationPlacedView
  editorView: AnnotationEditorView
  tool: AnnotationTool
  drawing: boolean
  sceneReady: boolean
  extrema: {
    rise: WseDifferenceExtremum | null
    reduction: WseDifferenceExtremum | null
  } | null
  extremaCalloutCount: number
  baselineLabel: string
  comparisonLabel: string
  editor: AnnotationAppearance
  activeResultField: ResultLabelField
  resultLabelOptions: Array<{
    value: ResultLabelField
    label: string
  }>
  selectedId: string | null
  selected: MapAnnotation | null
  selectedIndex: number
  listItemRefs: RefObject<Map<string, HTMLButtonElement>>
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
}

export type AnnotationPanelActions = {
  choosePanelView: (view: AnnotationPanelView) => void
  handlePanelTabKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationPanelView,
  ) => void
  chooseTool: (tool: AnnotationTool) => void
  cancelDrawing: () => void
  addExtremaCallouts: () => void
  updateAppearance: (patch: Partial<AnnotationDefaults>) => void
  setResultField: (field: ResultLabelField) => void
  selectPlaced: (annotation: MapAnnotation) => void
  handleListKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => void
  clearAnnotations: () => void
  returnToList: () => void
  selectAdjacent: (direction: -1 | 1) => void
  setEditorView: (view: AnnotationEditorView) => void
  handleEditorTabKeyDown: (
    event: KeyboardEvent<HTMLButtonElement>,
    view: AnnotationEditorView,
  ) => void
  nudgeSelected: (dx: number, dy: number) => void
  duplicateSelected: () => void
  deleteSelected: () => void
  undo: () => void
  redo: () => void
}
