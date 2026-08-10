import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { DEFAULT_COLOR_RAMP_BY_USE } from '../../../core/colorRamps'
import type { CartographySettings, FigureSettings } from '../../../core/types'
import { CartographyPanel } from '../../cartography/CartographyPanel'
import type { FigureSettingsChange } from '../settingsPanelTypes'
import { wseCartographySettings } from '../wseCartography'

type Props = {
  settings: FigureSettings
  onCartographyChange(value: CartographySettings): void
  onSettingsChange: FigureSettingsChange
}

export function CartographySettingsPanel({
  settings,
  onCartographyChange,
  onSettingsChange,
}: Props) {
  return (
    <CartographyPanel
      value={wseCartographySettings(settings)}
      defaultRamp={DEFAULT_COLOR_RAMP_BY_USE.wseDifference}
      units="ft"
      onChange={onCartographyChange}
    >
      <SettingsGroup title="Wet/Dry Change">
        <div className="field-grid two">
          <label className="field color-field">
            <span>Newly inundated</span>
            <input
              type="color"
              value={settings.newlyWetColor}
              onChange={(event) =>
                onSettingsChange('newlyWetColor', event.currentTarget.value)}
            />
          </label>
          <label className="field color-field">
            <span>Newly dry</span>
            <input
              type="color"
              value={settings.newlyDryColor}
              onChange={(event) =>
                onSettingsChange('newlyDryColor', event.currentTarget.value)}
            />
          </label>
        </div>
      </SettingsGroup>
    </CartographyPanel>
  )
}
