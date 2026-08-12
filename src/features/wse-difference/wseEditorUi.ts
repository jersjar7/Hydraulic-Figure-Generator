import type {
  AnnotationTool,
  FigureElementPanelKey,
  IngestNotice,
  MapCoordinate,
  MapElementKey,
} from '../../core/types'
import type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
  SettingsSectionKey,
} from './workspaceConfiguration'

export type WseEditorUiState = {
  annotationTool: AnnotationTool
  annotationPanelView: AnnotationPanelView
  annotationPlacedView: AnnotationPlacedView
  annotationEditorView: AnnotationEditorView
  selectedAnnotationId: string | null
  annotationStart: MapCoordinate | null
  annotationDragging: boolean
  assessmentCalloutDragging: boolean
  stationLabelDragging: boolean
  notices: IngestNotice[]
  busy: boolean
  leftOpen: boolean
  leftCollapsed: boolean
  rightOpen: boolean
  activeSettingsSection: SettingsSectionKey
  activeElement: FigureElementPanelKey
  selectedStationLabelId: string | null
  hoveredElement: MapElementKey | null
  elementDragging: boolean
}

export type EditorUiValue<T> = T | ((current: T) => T)

type EditorFieldAction = {
  [Key in keyof WseEditorUiState]: {
    type: 'field/set'
    field: Key
    value: EditorUiValue<WseEditorUiState[Key]>
  }
}[keyof WseEditorUiState]

export type WseEditorUiAction =
  | EditorFieldAction
  | { type: 'notices/append'; notices: IngestNotice[] }
  | { type: 'editor/reset' }

export function createWseEditorUiState(): WseEditorUiState {
  return {
    annotationTool: 'select',
    annotationPanelView: 'create',
    annotationPlacedView: 'list',
    annotationEditorView: 'content',
    selectedAnnotationId: null,
    annotationStart: null,
    annotationDragging: false,
    assessmentCalloutDragging: false,
    stationLabelDragging: false,
    notices: [],
    busy: false,
    leftOpen: false,
    leftCollapsed: false,
    rightOpen: false,
    activeSettingsSection: 'calculation',
    activeElement: 'title',
    selectedStationLabelId: null,
    hoveredElement: null,
    elementDragging: false,
  }
}

export function wseEditorUiReducer(
  state: WseEditorUiState,
  action: WseEditorUiAction,
): WseEditorUiState {
  if (action.type === 'editor/reset') return createWseEditorUiState()
  if (action.type === 'notices/append') {
    if (action.notices.length === 0) return state
    return {
      ...state,
      notices: [...state.notices, ...action.notices].slice(-40),
    }
  }

  const current = state[action.field]
  const next =
    typeof action.value === 'function'
      ? (action.value as (value: typeof current) => typeof current)(current)
      : action.value
  return { ...state, [action.field]: next }
}
