import {
  useCallback,
  useMemo,
  useReducer,
  type SetStateAction,
} from 'react'
import {
  createWseEditorUiState,
  wseEditorUiReducer,
  type WseEditorUiAction,
  type WseEditorUiState,
} from './wseEditorUi'

type UiSetter<Value> = (value: SetStateAction<Value>) => void

export function useWseEditorUi() {
  const [state, dispatch] = useReducer(
    wseEditorUiReducer,
    undefined,
    createWseEditorUiState,
  )

  const setters = useMemo(() => {
    function setter<Key extends keyof WseEditorUiState>(
      field: Key,
    ): UiSetter<WseEditorUiState[Key]> {
      return (value) =>
        dispatch({
          type: 'field/set',
          field,
          value,
        } as WseEditorUiAction)
    }

    return {
      setAnnotationTool: setter('annotationTool'),
      setAnnotationPanelView: setter('annotationPanelView'),
      setAnnotationPlacedView: setter('annotationPlacedView'),
      setAnnotationEditorView: setter('annotationEditorView'),
      setSelectedAnnotationId: setter('selectedAnnotationId'),
      setAnnotationStart: setter('annotationStart'),
      setAnnotationDragging: setter('annotationDragging'),
      setAssessmentCalloutDragging: setter('assessmentCalloutDragging'),
      setStationLabelDragging: setter('stationLabelDragging'),
      setNotices: setter('notices'),
      setBusy: setter('busy'),
      setLeftOpen: setter('leftOpen'),
      setLeftCollapsed: setter('leftCollapsed'),
      setRightOpen: setter('rightOpen'),
      setActiveSettingsSection: setter('activeSettingsSection'),
      setActiveElement: setter('activeElement'),
      setSelectedStationLabelId: setter('selectedStationLabelId'),
      setHoveredElement: setter('hoveredElement'),
      setElementDragging: setter('elementDragging'),
    }
  }, [dispatch])

  const resetEditorUi = useCallback(
    () => dispatch({ type: 'editor/reset' }),
    [dispatch],
  )
  const appendNotices = useCallback(
    (notices: WseEditorUiState['notices']) =>
      dispatch({ type: 'notices/append', notices }),
    [dispatch],
  )

  return {
    ...state,
    ...setters,
    appendNotices,
    resetEditorUi,
  }
}
