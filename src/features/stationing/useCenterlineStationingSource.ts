import { useCallback, useReducer } from 'react'
import type { CenterlineDirection } from '../../core/types'

export type CenterlineStationingSourceEntry = {
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
}

export type CenterlineStationingSourceState = {
  activeCenterlineId: string
  centerlines: CenterlineStationingSourceEntry[]
}

export type PersistedCenterlineStationingSource = {
  activeCenterlineId?: string
  centerlines?: CenterlineStationingSourceEntry[]
}

type Action =
  | { type: 'toggle-centerline'; id: string; selected: boolean }
  | { type: 'active-centerline'; id: string }
  | { type: 'direction'; direction: CenterlineDirection }
  | { type: 'start-station'; station: number }
  | { type: 'load'; value: PersistedCenterlineStationingSource }
  | { type: 'reset' }

export function createCenterlineStationingSourceState(): CenterlineStationingSourceState {
  return {
    activeCenterlineId: '',
    centerlines: [],
  }
}

function normalizePersistedSource(
  value: PersistedCenterlineStationingSource,
): CenterlineStationingSourceState {
  const centerlines = value.centerlines ?? []
  const activeCenterlineId = centerlines.some(
    (entry) => entry.centerlineId === value.activeCenterlineId,
  )
    ? value.activeCenterlineId!
    : centerlines[0]?.centerlineId ?? ''
  return { activeCenterlineId, centerlines }
}

function reducer(
  state: CenterlineStationingSourceState,
  action: Action,
): CenterlineStationingSourceState {
  switch (action.type) {
    case 'toggle-centerline': {
      if (action.selected) {
        if (state.centerlines.some((entry) => entry.centerlineId === action.id)) {
          return { ...state, activeCenterlineId: action.id }
        }
        return {
          activeCenterlineId: action.id,
          centerlines: [...state.centerlines, {
            centerlineId: action.id,
            direction: 'a-to-b',
            startStation: 0,
          }],
        }
      }
      const centerlines = state.centerlines.filter(
        (entry) => entry.centerlineId !== action.id,
      )
      return {
        activeCenterlineId:
          state.activeCenterlineId === action.id
            ? centerlines[0]?.centerlineId ?? ''
            : state.activeCenterlineId,
        centerlines,
      }
    }
    case 'active-centerline':
      return state.centerlines.some((entry) => entry.centerlineId === action.id)
        ? { ...state, activeCenterlineId: action.id }
        : state
    case 'direction':
      return {
        ...state,
        centerlines: state.centerlines.map((entry) =>
          entry.centerlineId === state.activeCenterlineId
            ? { ...entry, direction: action.direction }
            : entry,
        ),
      }
    case 'start-station':
      return {
        ...state,
        centerlines: state.centerlines.map((entry) =>
          entry.centerlineId === state.activeCenterlineId
            ? { ...entry, startStation: action.station }
            : entry,
        ),
      }
    case 'load':
      return normalizePersistedSource(action.value)
    case 'reset':
      return createCenterlineStationingSourceState()
  }
}

export function useCenterlineStationingSource() {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createCenterlineStationingSourceState,
  )
  const toggleCenterline = useCallback((id: string, selected: boolean) =>
    dispatch({ type: 'toggle-centerline', id, selected }), [])
  const setActiveCenterline = useCallback((id: string) =>
    dispatch({ type: 'active-centerline', id }), [])
  const setDirection = useCallback((direction: CenterlineDirection) =>
    dispatch({ type: 'direction', direction }), [])
  const setStartStation = useCallback((station: number) =>
    dispatch({ type: 'start-station', station }), [])
  const load = useCallback((value: PersistedCenterlineStationingSource) =>
    dispatch({ type: 'load', value }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  return {
    state,
    toggleCenterline,
    setActiveCenterline,
    setDirection,
    setStartStation,
    load,
    reset,
  }
}
