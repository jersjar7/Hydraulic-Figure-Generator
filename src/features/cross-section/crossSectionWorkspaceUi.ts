import type { IngestNotice } from '../../core/types'
import type { CrossSectionSettingsSectionKey } from './crossSectionDefinition'

export type CrossSectionWorkspaceUiState = {
  notices: IngestNotice[]
  busy: boolean
  leftOpen: boolean
  leftCollapsed: boolean
  rightOpen: boolean
  activeSection: CrossSectionSettingsSectionKey
}

export type CrossSectionWorkspaceUiValue<Value> =
  | Value
  | ((current: Value) => Value)

type FieldAction = {
  [Key in keyof CrossSectionWorkspaceUiState]: {
    type: 'field/set'
    field: Key
    value: CrossSectionWorkspaceUiValue<CrossSectionWorkspaceUiState[Key]>
  }
}[keyof CrossSectionWorkspaceUiState]

export type CrossSectionWorkspaceUiAction =
  | FieldAction
  | { type: 'notices/append'; notices: IngestNotice[] }
  | { type: 'project/reset' }

export function createCrossSectionWorkspaceUiState(): CrossSectionWorkspaceUiState {
  return {
    notices: [],
    busy: false,
    leftOpen: false,
    leftCollapsed: false,
    rightOpen: false,
    activeSection: 'section',
  }
}

export function crossSectionWorkspaceUiReducer(
  state: CrossSectionWorkspaceUiState,
  action: CrossSectionWorkspaceUiAction,
): CrossSectionWorkspaceUiState {
  if (action.type === 'project/reset') {
    return {
      ...state,
      notices: [],
      busy: false,
      leftCollapsed: false,
    }
  }
  if (action.type === 'notices/append') {
    if (action.notices.length === 0) return state
    return {
      ...state,
      notices: [...state.notices, ...action.notices].slice(-40),
    }
  }

  const current = state[action.field]
  const next = typeof action.value === 'function'
    ? (action.value as (value: typeof current) => typeof current)(current)
    : action.value
  return { ...state, [action.field]: next }
}
