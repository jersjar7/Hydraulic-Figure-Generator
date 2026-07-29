import {
  ArrowUpDown,
  ArrowUpRight,
  Crosshair,
  ImageDown,
  MapPin,
  MessageSquareText,
  Minus,
  MousePointer2,
  Palette,
  Settings2,
  SlidersHorizontal,
  Type,
} from 'lucide-react'
import type { AnnotationTool } from '../../core/types'
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

export const ANNOTATION_TOOLS = [
  { key: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'text', label: 'Text', icon: Type },
  { key: 'leader', label: 'Leader callout', icon: MessageSquareText },
  { key: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { key: 'line', label: 'Line', icon: Minus },
  { key: 'result', label: 'Automatic result label', icon: Crosshair },
  { key: 'extrema', label: 'Max / min WSE', icon: ArrowUpDown },
] as const satisfies ReadonlyArray<{
  key: AnnotationTool
  label: string
  icon: typeof MousePointer2
}>
