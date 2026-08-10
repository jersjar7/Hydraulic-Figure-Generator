import type {
  CenterlineStationingSettings,
  CenterlineStationTick,
  StationLabelOverride,
} from '../../core/types'
import { SelectedStationLabelEditor } from './SelectedStationLabelEditor'
import { StationingIntervalsSection } from './StationingIntervalsSection'
import { StationingLabelStyleSection } from './StationingLabelStyleSection'
import { StationingOverviewSection } from './StationingOverviewSection'
import { StationingTickStyleSection } from './StationingTickStyleSection'

type Props = {
  settings: CenterlineStationingSettings
  ticks: CenterlineStationTick[]
  selectedLabelId: string | null
  hasCenterline: boolean
  onChange(patch: Partial<CenterlineStationingSettings>): void
  onSelectLabel(id: string | null): void
  onOverrideChange(
    id: string,
    override: StationLabelOverride | null,
  ): void
  onNudgeSelected(dx: number, dy: number): void
  onResetSelectedPosition(): void
  onReset(): void
}

export function CenterlineStationingPanel({
  settings,
  ticks,
  selectedLabelId,
  hasCenterline,
  onChange,
  onSelectLabel,
  onOverrideChange,
  onNudgeSelected,
  onResetSelectedPosition,
  onReset,
}: Props) {
  return (
    <div className="stationing-settings">
      <StationingOverviewSection
        settings={settings}
        hasCenterline={hasCenterline}
        onChange={onChange}
        onReset={onReset}
      />
      <StationingIntervalsSection settings={settings} onChange={onChange} />
      <StationingTickStyleSection settings={settings} onChange={onChange} />
      <StationingLabelStyleSection settings={settings} onChange={onChange} />
      <SelectedStationLabelEditor
        settings={settings}
        ticks={ticks}
        selectedLabelId={selectedLabelId}
        onSelectLabel={onSelectLabel}
        onOverrideChange={onOverrideChange}
        onNudgeSelected={onNudgeSelected}
        onResetSelectedPosition={onResetSelectedPosition}
      />
    </div>
  )
}
