import {
  useCallback,
  useReducer,
  type SetStateAction,
} from 'react'
import type {
  AnnotationDefaults,
  CartographySettings,
  FigureSettings,
  MapAnnotation,
} from '../../core/types'
import {
  createWseFigureDocument,
  wseFigureDocumentReducer,
  type WseFigureDocument,
} from './wseFigureDocument'
import { withWseCartographySettings } from './wseCartography'

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
  const updateSetting = useCallback(
    <Key extends keyof FigureSettings>(
      key: Key,
      value: FigureSettings[Key],
    ) => dispatch({
      type: 'settings/set',
      value: (current) => ({ ...current, [key]: value }),
    }),
    [dispatch],
  )
  const updateCartography = useCallback(
    (value: CartographySettings) =>
      dispatch({
        type: 'settings/set',
        value: (current) => withWseCartographySettings(current, value),
      }),
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
    annotations: document.annotations,
    annotationDefaults: document.annotationDefaults,
    setSettings,
    updateSetting,
    updateCartography,
    setAnnotations,
    setAnnotationDefaults,
    loadDocument,
    resetDocument,
  }
}
