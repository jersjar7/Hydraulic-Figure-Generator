import type { MapOverlay } from '../../core/types'

export type HydraulicProjectDocument = {
  overlays: MapOverlay[]
}

export type ProjectDocumentValue<T> = T | ((current: T) => T)

export type HydraulicProjectDocumentAction =
  | { type: 'overlays/set'; value: ProjectDocumentValue<MapOverlay[]> }
  | { type: 'document/load'; document: HydraulicProjectDocument }
  | { type: 'document/reset' }

function resolveValue<T>(
  current: T,
  value: ProjectDocumentValue<T>,
) {
  return typeof value === 'function'
    ? (value as (current: T) => T)(current)
    : value
}

export function createHydraulicProjectDocument(): HydraulicProjectDocument {
  return { overlays: [] }
}

export function hydraulicProjectDocumentReducer(
  state: HydraulicProjectDocument,
  action: HydraulicProjectDocumentAction,
): HydraulicProjectDocument {
  switch (action.type) {
    case 'overlays/set':
      return {
        ...state,
        overlays: resolveValue(state.overlays, action.value),
      }
    case 'document/load':
      return action.document
    case 'document/reset':
      return createHydraulicProjectDocument()
  }
}
