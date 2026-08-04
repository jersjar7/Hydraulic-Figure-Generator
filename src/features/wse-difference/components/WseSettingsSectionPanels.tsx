import {
  Download,
  FileJson,
} from 'lucide-react'
import { ControlSection } from '../../../components/ControlSection'
import { FigureElementsPanel } from '../../../components/FigureElementsPanel'
import { CenterlineStationingToolPanel } from '../../stationing/CenterlineStationingToolPanel'
import type { WseSettingsSectionContext } from '../wseSettingsSections'
import { AnnotationSettingsPanel } from './AnnotationSettingsPanel'
import { CalculationSettingsPanel } from './CalculationSettingsPanel'
import { FrameSettingsPanel } from './FrameSettingsPanel'
import { LegendSettingsPanel } from './LegendSettingsPanel'

type Props = {
  context: WseSettingsSectionContext
}

export function CalculationSection({ context }: Props) {
  return <CalculationSettingsPanel {...context.calculation} />
}

export function LegendSection({ context }: Props) {
  return <LegendSettingsPanel {...context.legend} />
}

export function FrameSection({ context }: Props) {
  return <FrameSettingsPanel {...context.frame} />
}

export function ElementsSection({ context }: Props) {
  return (
    <ControlSection>
      <FigureElementsPanel {...context.elements} />
    </ControlSection>
  )
}

export function StationingSection({ context }: Props) {
  return <CenterlineStationingToolPanel {...context.stationing} />
}

export function AnnotationsSection({ context }: Props) {
  return <AnnotationSettingsPanel {...context.annotations} />
}

export function ExportSection({ context }: Props) {
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
