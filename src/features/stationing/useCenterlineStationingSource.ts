import { useReducer } from 'react'
import type { CenterlineDirection } from '../../core/types'

export type CenterlineStationingSourceState = {
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
}

export type PersistedCenterlineStationingSource = Partial<
  CenterlineStationingSourceState
>

type Action =
  | { type: 'centerline'; id: string }
  | { type: 'direction'; direction: CenterlineDirection }
  | { type: 'start-station'; station: number }
  | { type: 'load'; value: PersistedCenterlineStationingSource }
  | { type: 'reset' }

export function createCenterlineStationingSourceState(): CenterlineStationingSourceState {
  return {
    centerlineId: '',
    direction: 'a-to-b',
    startStation: 0,
  }
}

function reducer(
  state: CenterlineStationingSourceState,
  action: Action,
): CenterlineStationingSourceState {
  switch (action.type) {
    case 'centerline':
      return { ...state, centerlineId: action.id }
    case 'direction':
      return { ...state, direction: action.direction }
    case 'start-station':
      return { ...state, startStation: action.station }
    case 'load':
      return {
        centerlineId: action.value.centerlineId ?? '',
        direction: action.value.direction ?? 'a-to-b',
        startStation: action.value.startStation ?? 0,
      }
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
  return {
    state,
    setCenterline: (id: string) => dispatch({ type: 'centerline', id }),
    setDirection: (direction: CenterlineDirection) =>
      dispatch({ type: 'direction', direction }),
    setStartStation: (station: number) =>
      dispatch({ type: 'start-station', station }),
    load: (value: PersistedCenterlineStationingSource) =>
      dispatch({ type: 'load', value }),
    reset: () => dispatch({ type: 'reset' }),
  }
}
