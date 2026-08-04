import { Axis3d, ImageDown, LayoutTemplate, Palette } from 'lucide-react'
import { HYDRAULIC_PROFILE_SETTINGS_SECTIONS } from './hydraulicProfileDefinition'

export const HYDRAULIC_PROFILE_WORKSPACE_SETTINGS = [
  { ...HYDRAULIC_PROFILE_SETTINGS_SECTIONS[0], icon: LayoutTemplate },
  { ...HYDRAULIC_PROFILE_SETTINGS_SECTIONS[1], icon: Palette },
  { ...HYDRAULIC_PROFILE_SETTINGS_SECTIONS[2], icon: Axis3d },
  { ...HYDRAULIC_PROFILE_SETTINGS_SECTIONS[3], icon: ImageDown },
] as const
