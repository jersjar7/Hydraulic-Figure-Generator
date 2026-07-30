import {
  Download,
  FileJson,
  ImageDown,
  MapPin,
  MessageSquareText,
  Palette,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import type { ComponentProps } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
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
  WSE_DIFFERENCE_SETTINGS_SECTIONS,
  type WseDifferenceSettingsSectionKey,
} from './wseDifferenceDefinition'

export type WseSettingsSectionContext = {
  calculation: ComponentProps<typeof CalculationSettingsPanel>
  legend: ComponentProps<typeof LegendSettingsPanel>
  frame: ComponentProps<typeof FrameSettingsPanel>
  elements: ComponentProps<typeof FigureElementsPanel>
  annotations: ComponentProps<typeof AnnotationSettingsPanel>
  export: {
    canDownload: boolean
    onDownload: () => void | Promise<void>
  }
}

function CalculationSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return <CalculationSettingsPanel {...context.calculation} />
}

function LegendSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return <LegendSettingsPanel {...context.legend} />
}

function FrameSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return <FrameSettingsPanel {...context.frame} />
}

function ElementsSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return (
    <ControlSection>
      <FigureElementsPanel {...context.elements} />
    </ControlSection>
  )
}

function AnnotationsSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return <AnnotationSettingsPanel {...context.annotations} />
}

function ExportSection({
  context,
}: {
  context: WseSettingsSectionContext
}) {
  return (
    <ControlSection>
      <div className="export-note">
        <FileJson size={17} aria-hidden="true" />
        <span>
          Project files retain figure settings, overlays, and annotations. H5
          files remain local and must be re-added.
        </span>
      </div>
      <button
        className="button secondary full"
        type="button"
        disabled={!context.export.canDownload}
        onClick={context.export.onDownload}
      >
        <Download size={17} aria-hidden="true" />
        Download map PNG
      </button>
    </ControlSection>
  )
}

const COMPONENTS = {
  calculation: CalculationSection,
  legend: LegendSection,
  frame: FrameSection,
  elements: ElementsSection,
  annotations: AnnotationsSection,
  export: ExportSection,
} as const

const ICONS = {
  calculation: Settings2,
  legend: Palette,
  frame: SlidersHorizontal,
  elements: MapPin,
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
