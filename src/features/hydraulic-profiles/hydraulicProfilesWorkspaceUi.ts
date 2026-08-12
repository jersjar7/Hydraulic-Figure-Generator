import type { IngestNotice } from '../../core/types'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'

export type HydraulicProfilesWorkspaceUiState = {
  runtimeNotices: IngestNotice[]
  leftOpen: boolean
  leftCollapsed: boolean
  rightOpen: boolean
  activeSection: HydraulicProfileSettingsSectionKey
}

export type HydraulicProfilesWorkspaceUiValue<Value> =
  | Value
  | ((current: Value) => Value)

type FieldAction = {
  [Key in keyof HydraulicProfilesWorkspaceUiState]: {
    type: 'field/set'
    field: Key
    value: HydraulicProfilesWorkspaceUiValue<HydraulicProfilesWorkspaceUiState[Key]>
  }
}[keyof HydraulicProfilesWorkspaceUiState]

export type HydraulicProfilesWorkspaceUiAction =
  | FieldAction
  | { type: 'project/reset' }

export function createHydraulicProfilesWorkspaceUiState(): HydraulicProfilesWorkspaceUiState {
  return {
    runtimeNotices: [],
    leftOpen: false,
    leftCollapsed: false,
    rightOpen: false,
    activeSection: 'layout',
  }
}

export function hydraulicProfilesWorkspaceUiReducer(
  state: HydraulicProfilesWorkspaceUiState,
  action: HydraulicProfilesWorkspaceUiAction,
): HydraulicProfilesWorkspaceUiState {
  if (action.type === 'project/reset') {
    return {
      ...state,
      runtimeNotices: [],
      leftCollapsed: false,
    }
  }

  const current = state[action.field]
  const next = typeof action.value === 'function'
    ? (action.value as (value: typeof current) => typeof current)(current)
    : action.value
  return { ...state, [action.field]: next }
}
