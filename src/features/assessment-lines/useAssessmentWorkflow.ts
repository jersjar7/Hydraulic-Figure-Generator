import { useReducer } from 'react'
import type {
  AssessmentLineOverride,
  AssessmentLineOverrides,
  CenterlineDirection,
  StationedAssessmentLineStatus,
  WseAssessmentLineCollection,
} from '../../core/types'

export type AssessmentPanelView = 'summary' | 'review'
export type AssessmentReviewTab = StationedAssessmentLineStatus

export type AssessmentWorkflowState = {
  collection: WseAssessmentLineCollection
  panelView: AssessmentPanelView
  reviewTab: AssessmentReviewTab
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
  overrides: AssessmentLineOverrides
  selectedLineId: string | null
}

export type PersistedAssessmentWorkflow = {
  centerlineId?: string
  direction?: CenterlineDirection
  startStation?: number
  overrides?: AssessmentLineOverrides
}

type AssessmentWorkflowAction =
  | { type: 'set-collection'; collection: WseAssessmentLineCollection }
  | { type: 'invalidate'; interval: number }
  | { type: 'clear'; interval: number }
  | { type: 'open-review' }
  | { type: 'close-review' }
  | { type: 'set-review-tab'; tab: AssessmentReviewTab }
  | { type: 'set-centerline'; id: string }
  | { type: 'set-direction'; direction: CenterlineDirection }
  | { type: 'set-start-station'; station: number }
  | {
      type: 'set-override'
      lineId: string
      override: AssessmentLineOverride
    }
  | { type: 'select-line'; lineId: string | null }
  | { type: 'load'; value: PersistedAssessmentWorkflow; interval: number }
  | { type: 'reset'; interval: number }

function emptyCollection(interval: number): WseAssessmentLineCollection {
  return {
    interval,
    minimumLevel: null,
    maximumLevel: null,
    levelCount: 0,
    lines: [],
  }
}

export function createAssessmentWorkflowState(
  interval = 1,
): AssessmentWorkflowState {
  return {
    collection: emptyCollection(interval),
    panelView: 'summary',
    reviewTab: 'included',
    centerlineId: '',
    direction: 'a-to-b',
    startStation: 0,
    overrides: {},
    selectedLineId: null,
  }
}

function assessmentWorkflowReducer(
  state: AssessmentWorkflowState,
  action: AssessmentWorkflowAction,
): AssessmentWorkflowState {
  switch (action.type) {
    case 'set-collection':
      return {
        ...state,
        collection: action.collection,
        selectedLineId: null,
      }
    case 'invalidate':
      return {
        ...state,
        collection: emptyCollection(action.interval),
        selectedLineId: null,
      }
    case 'clear':
      return {
        ...state,
        collection: emptyCollection(action.interval),
        overrides: {},
        selectedLineId: null,
      }
    case 'open-review':
      return { ...state, panelView: 'review' }
    case 'close-review':
      return { ...state, panelView: 'summary', selectedLineId: null }
    case 'set-review-tab':
      return { ...state, reviewTab: action.tab, selectedLineId: null }
    case 'set-centerline':
      return {
        ...state,
        centerlineId: action.id,
        overrides: {},
        selectedLineId: null,
      }
    case 'set-direction':
      return { ...state, direction: action.direction }
    case 'set-start-station':
      return { ...state, startStation: action.station }
    case 'set-override':
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [action.lineId]: {
            ...state.overrides[action.lineId],
            ...action.override,
          },
        },
      }
    case 'select-line':
      return { ...state, selectedLineId: action.lineId }
    case 'load':
      return {
        ...createAssessmentWorkflowState(action.interval),
        centerlineId: action.value.centerlineId ?? '',
        direction: action.value.direction ?? 'a-to-b',
        startStation: action.value.startStation ?? 0,
        overrides: action.value.overrides ?? {},
      }
    case 'reset':
      return createAssessmentWorkflowState(action.interval)
  }
}

export function useAssessmentWorkflow(interval = 1) {
  const [state, dispatch] = useReducer(
    assessmentWorkflowReducer,
    interval,
    createAssessmentWorkflowState,
  )
  return {
    state,
    setCollection: (collection: WseAssessmentLineCollection) =>
      dispatch({ type: 'set-collection', collection }),
    invalidate: (nextInterval: number) =>
      dispatch({ type: 'invalidate', interval: nextInterval }),
    clear: (nextInterval: number) =>
      dispatch({ type: 'clear', interval: nextInterval }),
    openReview: () => dispatch({ type: 'open-review' }),
    closeReview: () => dispatch({ type: 'close-review' }),
    setReviewTab: (tab: AssessmentReviewTab) =>
      dispatch({ type: 'set-review-tab', tab }),
    setCenterline: (id: string) =>
      dispatch({ type: 'set-centerline', id }),
    setDirection: (direction: CenterlineDirection) =>
      dispatch({ type: 'set-direction', direction }),
    setStartStation: (station: number) =>
      dispatch({ type: 'set-start-station', station }),
    setOverride: (lineId: string, override: AssessmentLineOverride) =>
      dispatch({ type: 'set-override', lineId, override }),
    selectLine: (lineId: string | null) =>
      dispatch({ type: 'select-line', lineId }),
    load: (value: PersistedAssessmentWorkflow, nextInterval: number) =>
      dispatch({ type: 'load', value, interval: nextInterval }),
    reset: (nextInterval: number) =>
      dispatch({ type: 'reset', interval: nextInterval }),
  }
}
