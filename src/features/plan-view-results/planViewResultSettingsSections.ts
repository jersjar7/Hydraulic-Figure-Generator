import {
  Frame,
  ImageDown,
  Layers3,
  MapPin,
  Milestone,
  Palette,
} from 'lucide-react'
import { PLAN_VIEW_RESULT_SETTINGS_SECTIONS } from './planViewResultDefinition'

const ICONS = {
  result: Layers3,
  legend: Palette,
  frame: Frame,
  elements: MapPin,
  stationing: Milestone,
  export: ImageDown,
} as const

export const PLAN_VIEW_RESULT_WORKSPACE_SETTINGS =
  PLAN_VIEW_RESULT_SETTINGS_SECTIONS.map((section) => ({
    ...section,
    icon: ICONS[section.key],
  }))
