import {
  ImageDown,
  MapPin,
  MessageSquareText,
  Milestone,
  Palette,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
import { CenterlineStationingToolPanel } from '../stationing/CenterlineStationingToolPanel'
import {
  defineSettingsSections,
  settingsSectionByKey,
  type FigureSettingsSectionModule,
} from '../figures/settingsSectionModule'
import { AnnotationSettingsPanel } from './components/AnnotationSettingsPanel'
import { CalculationSettingsPanel } from './components/CalculationSettingsPanel'
import { FrameSettingsPanel } from './components/FrameSettingsPanel'
import { LegendSettingsPanel } from './components/LegendSettingsPanel'
import {
  AnnotationsSection,
  CalculationSection,
  ElementsSection,
  ExportSection,
  FrameSection,
  LegendSection,
  StationingSection,
} from './components/WseSettingsSectionPanels'
import {
  WSE_DIFFERENCE_SETTINGS_SECTIONS,
  type WseDifferenceSettingsSectionKey,
} from './wseDifferenceDefinition'

export type WseSettingsSectionContext = {
  calculation: ComponentProps<typeof CalculationSettingsPanel>
  legend: ComponentProps<typeof LegendSettingsPanel>
  frame: ComponentProps<typeof FrameSettingsPanel>
  elements: ComponentProps<typeof FigureElementsPanel>
  stationing: ComponentProps<typeof CenterlineStationingToolPanel>
  annotations: ComponentProps<typeof AnnotationSettingsPanel>
  export: {
    actions: ReactNode
    canDownload: boolean
    onDownload: () => void | Promise<void>
  }
}

const COMPONENTS = {
  calculation: CalculationSection,
  legend: LegendSection,
  frame: FrameSection,
  elements: ElementsSection,
  stationing: StationingSection,
  annotations: AnnotationsSection,
  export: ExportSection,
} as const

const ICONS = {
  calculation: Settings2,
  legend: Palette,
  frame: SlidersHorizontal,
  elements: MapPin,
  stationing: Milestone,
  annotations: MessageSquareText,
  export: ImageDown,
} as const

export const WSE_SETTINGS_SECTIONS = defineSettingsSections(
  WSE_DIFFERENCE_SETTINGS_SECTIONS.map((section) => ({
    ...section,
    icon: ICONS[section.key],
    component: COMPONENTS[section.key],
  })) satisfies readonly FigureSettingsSectionModule<
    WseDifferenceSettingsSectionKey,
    WseSettingsSectionContext
  >[],
)

export function wseSettingsSectionByKey(
  key: WseDifferenceSettingsSectionKey,
) {
  return settingsSectionByKey(WSE_SETTINGS_SECTIONS, key)
}
