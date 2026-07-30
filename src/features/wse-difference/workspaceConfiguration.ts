import type { WseDifferenceSettingsSectionKey } from './wseDifferenceDefinition'

export const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

export type SettingsSectionKey = WseDifferenceSettingsSectionKey
export type AnnotationPanelView = 'create' | 'placed'
export type AnnotationPlacedView = 'list' | 'detail'
export type AnnotationEditorView = 'content' | 'style' | 'position'
