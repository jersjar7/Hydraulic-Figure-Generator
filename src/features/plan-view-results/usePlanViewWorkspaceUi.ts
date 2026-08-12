import { useCallback, useMemo, useReducer, type SetStateAction } from 'react'
import type { IngestNotice } from '../../core/types'
import {
  createPlanViewWorkspaceUiState,
  planViewWorkspaceUiReducer,
  type PlanViewWorkspaceUiAction,
  type PlanViewWorkspaceUiState,
} from './planViewWorkspaceUi'

type UiSetter<Value> = (value: SetStateAction<Value>) => void

export function usePlanViewWorkspaceUi() {
  const [state, dispatch] = useReducer(
    planViewWorkspaceUiReducer,
    undefined,
    createPlanViewWorkspaceUiState,
  )

  const setters = useMemo(() => {
    function setter<Key extends keyof PlanViewWorkspaceUiState>(
      field: Key,
    ): UiSetter<PlanViewWorkspaceUiState[Key]> {
      return (value) => dispatch({ type: 'field/set', field, value } as PlanViewWorkspaceUiAction)
    }

    return {
      setNotices: setter('notices'),
      setBusy: setter('busy'),
      setLeftOpen: setter('leftOpen'),
      setLeftCollapsed: setter('leftCollapsed'),
      setRightOpen: setter('rightOpen'),
      setProductionMode: setter('productionMode'),
      setActiveSection: setter('activeSection'),
      setActiveElement: setter('activeElement'),
    }
  }, [])

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    dispatch({
      type: 'field/set',
      field: 'notices',
      value: (current) => [...current, ...incoming].slice(-40),
    })
  }, [])
  const resetForProject = useCallback(
    () => dispatch({ type: 'project/reset' }),
    [],
  )

  return { ...state, ...setters, appendNotices, resetForProject }
}
