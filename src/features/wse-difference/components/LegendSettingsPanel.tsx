import { ControlSection } from '../../../components/ControlSection'
import type { FigureSettings } from '../../../core/types'
import type { FigureSettingsChange } from '../settingsPanelTypes'

type LegendSettingsPanelProps = {
  settings: FigureSettings
  onSettingsChange: FigureSettingsChange
}

const optionalNumber = (value: string, fallback: number) => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function LegendSettingsPanel({
  settings,
  onSettingsChange,
}: LegendSettingsPanelProps) {
  return (
    <ControlSection>
      <div className="field-grid two">
        <label className="field">
          <span>
            Symmetric bound <small>± ft</small>
          </span>
          <input
            type="number"
            min="0.01"
            step="0.25"
            placeholder="Auto"
            value={settings.legendBound ?? ''}
            onChange={(event) =>
              onSettingsChange(
                'legendBound',
                optionalNumber(event.target.value, 3),
              )
            }
          />
        </label>
        <label className="field">
          <span>
            Legend interval <small>ft</small>
          </span>
          <input
            type="number"
            min="0.01"
            step="0.1"
            placeholder="Auto"
            value={settings.legendInterval ?? ''}
            onChange={(event) =>
              onSettingsChange(
                'legendInterval',
                optionalNumber(event.target.value, 0.5),
              )
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Newly inundated</span>
          <input
            type="color"
            value={settings.newlyWetColor}
            onChange={(event) =>
              onSettingsChange('newlyWetColor', event.target.value)
            }
          />
        </label>
        <label className="field color-field">
          <span>Newly dry</span>
          <input
            type="color"
            value={settings.newlyDryColor}
            onChange={(event) =>
              onSettingsChange('newlyDryColor', event.target.value)
            }
          />
        </label>
      </div>
    </ControlSection>
  )
}
