import {
  useCallback,
  useReducer,
  type SetStateAction,
} from 'react'
import type {
  AnnotationDefaults,
  FigureSettings,
  MapAnnotation,
  MapOverlay,
} from '../../core/types'
import {
  createWseFigureDocument,
  wseFigureDocumentReducer,
  type WseFigureDocument,
} from './wseFigureDocument'

export function useWseFigureDocument() {
  const [document, dispatch] = useReducer(
    wseFigureDocumentReducer,
    undefined,
    createWseFigureDocument,
  )

  const setSettings = useCallback(
    (value: SetStateAction<FigureSettings>) =>
      dispatch({ type: 'settings/set', value }),
    [dispatch],
  )
  const setOverlays = useCallback(
    (value: SetStateAction<MapOverlay[]>) =>
      dispatch({ type: 'overlays/set', value }),
    [dispatch],
  )
  const setAnnotations = useCallback(
    (value: SetStateAction<MapAnnotation[]>) =>
      dispatch({ type: 'annotations/set', value }),
    [dispatch],
  )
  const setAnnotationDefaults = useCallback(
    (value: SetStateAction<AnnotationDefaults>) =>
      dispatch({ type: 'annotation-defaults/set', value }),
    [dispatch],
  )
  const loadDocument = useCallback(
    (next: WseFigureDocument) =>
      dispatch({ type: 'document/load', document: next }),
    [dispatch],
  )
  const resetDocument = useCallback(
    () => dispatch({ type: 'document/reset' }),
    [dispatch],
  )

  return {
    document,
    settings: document.settings,
    overlays: document.overlays,
    annotations: document.annotations,
    annotationDefaults: document.annotationDefaults,
    setSettings,
    setOverlays,
    setAnnotations,
    setAnnotationDefaults,
    loadDocument,
    resetDocument,
  }
}
