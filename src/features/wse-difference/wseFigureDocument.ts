import { createDefaultAnnotationSettings } from '../../core/defaults'
import type {
  AnnotationDefaults,
  FigureSettings,
  MapAnnotation,
  MapOverlay,
} from '../../core/types'
import { wseDifferenceFigure } from './wseDifferenceFigure'

export type WseFigureDocument = {
  settings: FigureSettings
  overlays: MapOverlay[]
  annotations: MapAnnotation[]
  annotationDefaults: AnnotationDefaults
}

export type DocumentValue<T> = T | ((current: T) => T)

export type WseFigureDocumentAction =
  | { type: 'settings/set'; value: DocumentValue<FigureSettings> }
  | { type: 'overlays/set'; value: DocumentValue<MapOverlay[]> }
  | { type: 'annotations/set'; value: DocumentValue<MapAnnotation[]> }
  | {
      type: 'annotation-defaults/set'
      value: DocumentValue<AnnotationDefaults>
    }
  | { type: 'document/load'; document: WseFigureDocument }
  | { type: 'document/reset' }

function resolveValue<T>(current: T, value: DocumentValue<T>) {
  return typeof value === 'function'
    ? (value as (current: T) => T)(current)
    : value
}

export function createWseFigureDocument(): WseFigureDocument {
  return {
    settings: wseDifferenceFigure.createDefaultSettings(),
    overlays: [],
    annotations: [],
    annotationDefaults: createDefaultAnnotationSettings(),
  }
}

export function wseFigureDocumentReducer(
  state: WseFigureDocument,
  action: WseFigureDocumentAction,
): WseFigureDocument {
  switch (action.type) {
    case 'settings/set':
      return {
        ...state,
        settings: resolveValue(state.settings, action.value),
      }
    case 'overlays/set':
      return {
        ...state,
        overlays: resolveValue(state.overlays, action.value),
      }
    case 'annotations/set':
      return {
        ...state,
        annotations: resolveValue(state.annotations, action.value),
      }
    case 'annotation-defaults/set':
      return {
        ...state,
        annotationDefaults: resolveValue(
          state.annotationDefaults,
          action.value,
        ),
      }
    case 'document/load':
      return action.document
    case 'document/reset':
      return createWseFigureDocument()
  }
}
