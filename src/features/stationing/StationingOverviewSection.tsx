import { RotateCcw } from 'lucide-react'
import type { CenterlineStationingSettings } from '../../core/types'
import {
  StationingSectionHeading,
  StationingToggle,
} from './stationingControls'

type Props = {
  settings: CenterlineStationingSettings
  hasCenterline: boolean
  onChange(patch: Partial<CenterlineStationingSettings>): void
  onReset(): void
}

export function StationingOverviewSection({
  settings,
  hasCenterline,
  onChange,
  onReset,
}: Props) {
  const applyPreset = (preset: '25-100' | '50-100' | '100-only') => {
    if (preset === '25-100') {
      onChange({
        minorInterval: 25,
        majorInterval: 100,
        labelInterval: 100,
        showMinorTicks: true,
        showMajorTicks: true,
        showLabels: true,
      })
      return
    }
    if (preset === '50-100') {
      onChange({
        minorInterval: 50,
        majorInterval: 100,
        labelInterval: 100,
        showMinorTicks: true,
        showMajorTicks: true,
        showLabels: true,
      })
      return
    }
    onChange({
      minorInterval: 100,
      majorInterval: 100,
      labelInterval: 100,
      showMinorTicks: false,
      showMajorTicks: true,
      showLabels: true,
    })
  }

  return (
    <>
      <div className="stationing-top-actions">
        <StationingToggle
          label="Show on figure"
          checked={settings.visible}
          disabled={!hasCenterline}
          onChange={(visible) => onChange({ visible })}
        />
        <button
          className="button secondary compact element-reset"
          type="button"
          onClick={onReset}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>

      {!hasCenterline ? (
        <p className="empty-note">
          Choose a centerline feature above to enable and style station ticks.
        </p>
      ) : null}

      <StationingSectionHeading>Preset</StationingSectionHeading>
      <div className="stationing-presets">
        <button type="button" onClick={() => applyPreset('25-100')}>
          25 / 100
        </button>
        <button type="button" onClick={() => applyPreset('50-100')}>
          50 / 100
        </button>
        <button type="button" onClick={() => applyPreset('100-only')}>
          100 only
        </button>
      </div>

      <StationingSectionHeading>Visibility</StationingSectionHeading>
      <div className="field-grid two stationing-toggle-grid">
        <StationingToggle
          label="Minor ticks"
          checked={settings.showMinorTicks}
          onChange={(showMinorTicks) => onChange({ showMinorTicks })}
        />
        <StationingToggle
          label="Major ticks"
          checked={settings.showMajorTicks}
          onChange={(showMajorTicks) => onChange({ showMajorTicks })}
        />
        <StationingToggle
          label="Station labels"
          checked={settings.showLabels}
          onChange={(showLabels) => onChange({ showLabels })}
        />
        <StationingToggle
          label="A / B endpoints"
          checked={settings.showEndpoints}
          onChange={(showEndpoints) => onChange({ showEndpoints })}
        />
      </div>
      <StationingToggle
        label="Increasing-station arrow"
        checked={settings.showDirectionArrow}
        onChange={(showDirectionArrow) => onChange({ showDirectionArrow })}
      />
    </>
  )
}
