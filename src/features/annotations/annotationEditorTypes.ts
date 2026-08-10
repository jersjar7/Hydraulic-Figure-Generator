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
import type { AnnotationToolModule } from './annotationTools'

export type AnnotationPanelView = 'create' | 'placed'
export type AnnotationPlacedView = 'list' | 'detail'
export type AnnotationEditorView = 'content' | 'style' | 'position'

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
  tools?: readonly AnnotationToolModule[]
  drawing: boolean
  sceneReady: boolean
  editor: AnnotationAppearance
  selectedId: string | null
  selected: MapAnnotation | null
  selectedIndex: number
  listItemRefs: RefObject<Map<string, HTMLButtonElement>>
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
  activeResultField: ResultLabelField
  resultLabelOptions: Array<{
    value: ResultLabelField
    label: string
  }>
  extrema?: {
    rise: WseDifferenceExtremum | null
    reduction: WseDifferenceExtremum | null
  } | null
  extremaCalloutCount?: number
  baselineLabel?: string
  comparisonLabel?: string
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
  setSelectedVisible: (visible: boolean) => void
  setSelectedLocked: (locked: boolean) => void
  setSelectedLeaderVisible: (visible: boolean) => void
  resetSelectedPosition: () => void
  duplicateSelected: () => void
  sendSelectedBackward: () => void
  bringSelectedForward: () => void
  deleteSelected: () => void
  undo: () => void
  redo: () => void
}
