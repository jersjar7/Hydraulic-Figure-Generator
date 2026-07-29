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

export const FRAME_ASPECTS = {
  landscape: 1650 / 1275,
  portrait: 1275 / 1650,
} as const

export const SETTINGS_SECTIONS = [
  {
    key: 'calculation',
    label: 'Map',
    title: 'Map calculation',
    icon: Settings2,
  },
  {
    key: 'legend',
    label: 'Legend',
    title: 'Legend and colors',
    icon: Palette,
  },
  {
    key: 'frame',
    label: 'View',
    title: 'Frame and view',
    icon: SlidersHorizontal,
  },
  {
    key: 'elements',
    label: 'Elements',
    title: 'Figure elements',
    icon: MapPin,
  },
  {
    key: 'annotations',
    label: 'Callouts',
    title: 'Annotations and callouts',
    icon: MessageSquareText,
  },
  {
    key: 'export',
    label: 'Export',
    title: 'Export',
    icon: ImageDown,
  },
] as const

export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number]['key']
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
