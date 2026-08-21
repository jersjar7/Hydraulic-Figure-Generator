import {
  Frame,
  ImageDown,
  Layers3,
  MapPin,
  MessageSquareText,
  Milestone,
  Palette,
  Navigation2,
} from 'lucide-react'
import { PLAN_VIEW_RESULT_SETTINGS_SECTIONS } from './planViewResultDefinition'

const ICONS = {
  result: Layers3,
  cartography: Palette,
  vectors: Navigation2,
  frame: Frame,
  elements: MapPin,
  stationing: Milestone,
  annotations: MessageSquareText,
  export: ImageDown,
} as const

export const PLAN_VIEW_RESULT_WORKSPACE_SETTINGS =
  PLAN_VIEW_RESULT_SETTINGS_SECTIONS.map((section) => ({
    ...section,
    icon: ICONS[section.key],
  }))
