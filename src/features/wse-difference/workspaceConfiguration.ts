import type { WseDifferenceSettingsSectionKey } from './wseDifferenceDefinition'
export type {
  AnnotationEditorView,
  AnnotationPanelView,
  AnnotationPlacedView,
} from '../annotations/annotationEditorTypes'

export const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

export type SettingsSectionKey = WseDifferenceSettingsSectionKey
