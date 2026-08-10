import { ControlSection } from '../../components/ControlSection'
import type {
  CenterlineStationingSettings,
  CenterlineStationTick,
  StationLabelOverride,
} from '../../core/types'
import {
  CenterlineSourceControls,
  type CenterlineSourceControlsProps,
} from './CenterlineSourceControls'
import { CenterlineStationingPanel } from './CenterlineStationingPanel'

type Props = CenterlineSourceControlsProps & {
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

export function CenterlineStationingToolPanel({
  candidates,
  centerlineId,
  selectedCenterlineIds,
  direction,
  startStation,
  settings,
  ticks,
  selectedLabelId,
  hasCenterline,
  onCenterlineChange,
  onCenterlineToggle,
  onDirectionChange,
  onStartStationChange,
  onChange,
  onSelectLabel,
  onOverrideChange,
  onNudgeSelected,
  onResetSelectedPosition,
  onReset,
}: Props) {
  return (
    <ControlSection>
      <CenterlineSourceControls
        candidates={candidates}
        centerlineId={centerlineId}
        selectedCenterlineIds={selectedCenterlineIds}
        direction={direction}
        startStation={startStation}
        onCenterlineChange={onCenterlineChange}
        onCenterlineToggle={onCenterlineToggle}
        onDirectionChange={onDirectionChange}
        onStartStationChange={onStartStationChange}
      />
      <CenterlineStationingPanel
        settings={settings}
        ticks={ticks}
        selectedLabelId={selectedLabelId}
        hasCenterline={hasCenterline}
        onChange={onChange}
        onSelectLabel={onSelectLabel}
        onOverrideChange={onOverrideChange}
        onNudgeSelected={onNudgeSelected}
        onResetSelectedPosition={onResetSelectedPosition}
        onReset={onReset}
      />
    </ControlSection>
  )
}
