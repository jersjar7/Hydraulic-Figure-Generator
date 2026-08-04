import {
  ImageDown,
  LineChart,
  Palette,
  Ruler,
} from 'lucide-react'
import { CROSS_SECTION_SETTINGS_SECTIONS } from './crossSectionDefinition'

export const CROSS_SECTION_WORKSPACE_SETTINGS = [
  { ...CROSS_SECTION_SETTINGS_SECTIONS[0], icon: Ruler },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[1], icon: LineChart },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[2], icon: Palette },
  { ...CROSS_SECTION_SETTINGS_SECTIONS[3], icon: ImageDown },
] as const
