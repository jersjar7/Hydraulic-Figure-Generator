import { ControlSection } from '../../../components/ControlSection'
import type { FigureSettings } from '../../../core/types'
import type { FigureSettingsChange } from '../settingsPanelTypes'
import { Toggle } from './Toggle'

type CalculationSettingsPanelProps = {
  settings: FigureSettings
  onSettingsChange: FigureSettingsChange
  onDryDepthChange: (value: number) => void
}

const numeric = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function CalculationSettingsPanel({
  settings,
  onSettingsChange,
  onDryDepthChange,
}: CalculationSettingsPanelProps) {
  return (
    <ControlSection>
      <label className="field">
        <span>
          Dry-depth threshold
          <small>ft</small>
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={settings.dryDepth}
          onChange={(event) =>
            onDryDepthChange(numeric(event.target.value, 0))
          }
        />
      </label>
      <p className="field-help">
        Depths at or below this value are dry. At 0.00 ft, every positive
        modeled depth is wet.
      </p>
      <Toggle
        label="Newly wet/dry fill"
        checked={settings.showWetDry}
        onChange={(checked) =>
          onSettingsChange('showWetDry', checked)
        }
      />
    </ControlSection>
  )
}
