import { useCallback, useMemo, useReducer, type SetStateAction } from 'react'
import type { IngestNotice } from '../../core/types'
import {
  createHydraulicProfilesWorkspaceUiState,
  hydraulicProfilesWorkspaceUiReducer,
  type HydraulicProfilesWorkspaceUiAction,
  type HydraulicProfilesWorkspaceUiState,
} from './hydraulicProfilesWorkspaceUi'

type UiSetter<Value> = (value: SetStateAction<Value>) => void

export function useHydraulicProfilesWorkspaceUi() {
  const [state, dispatch] = useReducer(
    hydraulicProfilesWorkspaceUiReducer,
    undefined,
    createHydraulicProfilesWorkspaceUiState,
  )

  const setters = useMemo(() => {
    function setter<Key extends keyof HydraulicProfilesWorkspaceUiState>(
      field: Key,
    ): UiSetter<HydraulicProfilesWorkspaceUiState[Key]> {
      return (value) => dispatch({
        type: 'field/set',
        field,
        value,
      } as HydraulicProfilesWorkspaceUiAction)
    }

    return {
      setLeftOpen: setter('leftOpen'),
      setLeftCollapsed: setter('leftCollapsed'),
      setRightOpen: setter('rightOpen'),
      setActiveSection: setter('activeSection'),
    }
  }, [])

  const appendNotices = useCallback((incoming: IngestNotice[]) => {
    if (incoming.length === 0) return
    dispatch({
      type: 'field/set',
      field: 'runtimeNotices',
      value: (current) => [...current, ...incoming].slice(-20),
    })
  }, [])
  const resetForProject = useCallback(
    () => dispatch({ type: 'project/reset' }),
    [],
  )

  return { ...state, ...setters, appendNotices, resetForProject }
}
