import {
  ImageDown,
  MapPin,
  MessageSquareText,
  Milestone,
  Palette,
  Settings2,
  SlidersHorizontal,
  Spline,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
import { CenterlineStationingToolPanel } from '../stationing/CenterlineStationingToolPanel'
import { AssessmentLinesToolPanel } from '../assessment-lines/AssessmentLinesToolPanel'
import {
  defineSettingsSections,
  settingsSectionByKey,
  type FigureSettingsSectionModule,
} from '../figures/settingsSectionModule'
import { AnnotationSettingsPanel } from './components/AnnotationSettingsPanel'
import { CalculationSettingsPanel } from './components/CalculationSettingsPanel'
import { FrameSettingsPanel } from './components/FrameSettingsPanel'
import { CartographySettingsPanel } from './components/CartographySettingsPanel'
import {
  AnnotationsSection,
  AssessmentLinesSection,
  CalculationSection,
  ElementsSection,
  ExportSection,
  FrameSection,
  CartographySection,
  StationingSection,
} from './components/WseSettingsSectionPanels'
import {
  WSE_DIFFERENCE_SETTINGS_SECTIONS,
  type WseDifferenceSettingsSectionKey,
} from './wseDifferenceDefinition'

export type WseSettingsSectionContext = {
  calculation: ComponentProps<typeof CalculationSettingsPanel>
  assessmentLines: ComponentProps<typeof AssessmentLinesToolPanel>
  cartography: ComponentProps<typeof CartographySettingsPanel>
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
  assessmentLines: AssessmentLinesSection,
  cartography: CartographySection,
  frame: FrameSection,
  elements: ElementsSection,
  stationing: StationingSection,
  annotations: AnnotationsSection,
  export: ExportSection,
} as const

const ICONS = {
  calculation: Settings2,
  assessmentLines: Spline,
  cartography: Palette,
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
