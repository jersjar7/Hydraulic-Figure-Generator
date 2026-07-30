import {
  ImageDown,
  MapPin,
  MessageSquareText,
  Palette,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import {
  WSE_DIFFERENCE_SETTINGS_SECTIONS,
  type WseDifferenceSettingsSectionKey,
} from './wseDifferenceDefinition'

export const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

const SETTINGS_SECTION_ICONS = {
  calculation: Settings2,
  legend: Palette,
  frame: SlidersHorizontal,
  elements: MapPin,
  annotations: MessageSquareText,
  export: ImageDown,
} as const satisfies Record<WseDifferenceSettingsSectionKey, typeof Settings2>

export const SETTINGS_SECTIONS = WSE_DIFFERENCE_SETTINGS_SECTIONS.map(
  (section) => ({
    ...section,
    icon: SETTINGS_SECTION_ICONS[section.key],
  }),
)

export type SettingsSectionKey = WseDifferenceSettingsSectionKey
export type AnnotationPanelView = 'create' | 'placed'
export type AnnotationPlacedView = 'list' | 'detail'
export type AnnotationEditorView = 'content' | 'style' | 'position'
