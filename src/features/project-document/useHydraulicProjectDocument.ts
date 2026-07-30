import {
  useCallback,
  useReducer,
  type SetStateAction,
} from 'react'
import type { MapOverlay } from '../../core/types'
import {
  createHydraulicProjectDocument,
  hydraulicProjectDocumentReducer,
  type HydraulicProjectDocument,
} from './hydraulicProjectDocument'

export function useHydraulicProjectDocument() {
  const [document, dispatch] = useReducer(
    hydraulicProjectDocumentReducer,
    undefined,
    createHydraulicProjectDocument,
  )

  const setOverlays = useCallback(
    (value: SetStateAction<MapOverlay[]>) =>
      dispatch({ type: 'overlays/set', value }),
    [],
  )
  const loadDocument = useCallback(
    (next: HydraulicProjectDocument) =>
      dispatch({ type: 'document/load', document: next }),
    [],
  )
  const resetDocument = useCallback(
    () => dispatch({ type: 'document/reset' }),
    [],
  )

  return {
    document,
    overlays: document.overlays,
    setOverlays,
    loadDocument,
    resetDocument,
  }
}
