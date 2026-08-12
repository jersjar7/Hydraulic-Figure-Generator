import type { FigureElementPanelKey, IngestNotice } from '../../core/types'
import type { FigureProductionMode } from '../figure-sets/FigureProductionModeSwitcher'
import type { PlanViewResultSettingsSectionKey } from './planViewResultDefinition'

export type PlanViewWorkspaceUiState = {
  notices: IngestNotice[]
  busy: boolean
  leftOpen: boolean
  leftCollapsed: boolean
  rightOpen: boolean
  productionMode: FigureProductionMode
  activeSection: PlanViewResultSettingsSectionKey
  activeElement: FigureElementPanelKey
}

export type PlanViewWorkspaceUiValue<Value> =
  | Value
  | ((current: Value) => Value)

type FieldAction = {
  [Key in keyof PlanViewWorkspaceUiState]: {
    type: 'field/set'
    field: Key
    value: PlanViewWorkspaceUiValue<PlanViewWorkspaceUiState[Key]>
  }
}[keyof PlanViewWorkspaceUiState]

export type PlanViewWorkspaceUiAction =
  | FieldAction
  | { type: 'project/reset' }

export function createPlanViewWorkspaceUiState(): PlanViewWorkspaceUiState {
  return {
    notices: [],
    busy: false,
    leftOpen: false,
    leftCollapsed: false,
    rightOpen: false,
    productionMode: 'figure',
    activeSection: 'result',
    activeElement: 'title',
  }
}

export function planViewWorkspaceUiReducer(
  state: PlanViewWorkspaceUiState,
  action: PlanViewWorkspaceUiAction,
): PlanViewWorkspaceUiState {
  if (action.type === 'project/reset') {
    return {
      ...state,
      notices: [],
      busy: false,
      leftCollapsed: false,
      productionMode: 'figure',
      activeSection: 'result',
    }
  }

  const current = state[action.field]
  const next = typeof action.value === 'function'
    ? (action.value as (value: typeof current) => typeof current)(current)
    : action.value
  return { ...state, [action.field]: next }
}
