import { useCallback, useMemo, useReducer, type SetStateAction } from 'react'
import type { IngestNotice } from '../../core/types'
import {
  createCrossSectionWorkspaceUiState,
  crossSectionWorkspaceUiReducer,
  type CrossSectionWorkspaceUiAction,
  type CrossSectionWorkspaceUiState,
} from './crossSectionWorkspaceUi'

type UiSetter<Value> = (value: SetStateAction<Value>) => void

export function useCrossSectionWorkspaceUi() {
  const [state, dispatch] = useReducer(
    crossSectionWorkspaceUiReducer,
    undefined,
    createCrossSectionWorkspaceUiState,
  )
  const setters = useMemo(() => {
    function setter<Key extends keyof CrossSectionWorkspaceUiState>(
      field: Key,
    ): UiSetter<CrossSectionWorkspaceUiState[Key]> {
      return (value) => dispatch({
        type: 'field/set',
        field,
        value,
      } as CrossSectionWorkspaceUiAction)
    }
    return {
      setBusy: setter('busy'),
      setLeftOpen: setter('leftOpen'),
      setLeftCollapsed: setter('leftCollapsed'),
      setRightOpen: setter('rightOpen'),
      setActiveSection: setter('activeSection'),
    }
  }, [])
  const appendNotices = useCallback((notices: IngestNotice[]) => {
    dispatch({ type: 'notices/append', notices })
  }, [])
  const resetForProject = useCallback(() => {
    dispatch({ type: 'project/reset' })
  }, [])

  return { ...state, ...setters, appendNotices, resetForProject }
}
