import type { CenterlineStationingSettings } from '../../core/types'
import { StationingSectionHeading, StationingToggle } from './stationingControls'
import { stationingNumberValue } from './stationingValues'

type Props = {
  settings: CenterlineStationingSettings
  onChange(patch: Partial<CenterlineStationingSettings>): void
}

export function StationingLabelStyleSection({ settings, onChange }: Props) {
  return (
    <>
      <StationingSectionHeading>Labels</StationingSectionHeading>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Color</span>
          <input
            type="color"
            value={settings.labelColor}
            onChange={(event) => onChange({ labelColor: event.target.value })}
          />
        </label>
        <label className="field">
          <span>
            Font size <small>px</small>
          </span>
          <input
            type="number"
            min="6"
            max="72"
            value={settings.labelFontSize}
            onChange={(event) =>
              onChange({
                labelFontSize: stationingNumberValue(
                  event.target.value,
                  settings.labelFontSize,
                ),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>Side</span>
          <select
            value={settings.labelSide}
            onChange={(event) =>
              onChange({
                labelSide: event.target
                  .value as CenterlineStationingSettings['labelSide'],
              })
            }
          >
            <option value="auto">Auto avoid overlap</option>
            <option value="alternate">Alternate</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="field">
          <span>Orientation</span>
          <select
            value={settings.labelOrientation}
            onChange={(event) =>
              onChange({
                labelOrientation: event.target
                  .value as CenterlineStationingSettings['labelOrientation'],
              })
            }
          >
            <option value="horizontal">Horizontal</option>
            <option value="aligned">Along centerline</option>
          </select>
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Offset <small>px</small>
          </span>
          <input
            type="number"
            min="0"
            max="160"
            value={settings.labelOffset}
            onChange={(event) =>
              onChange({
                labelOffset: stationingNumberValue(
                  event.target.value,
                  settings.labelOffset,
                ),
              })
            }
          />
        </label>
        <label className="field">
          <span>Decimals</span>
          <select
            value={settings.decimalPlaces}
            onChange={(event) =>
              onChange({
                decimalPlaces: Number(
                  event.target.value,
                ) as CenterlineStationingSettings['decimalPlaces'],
              })
            }
          >
            <option value="0">None</option>
            <option value="1">One</option>
            <option value="2">Two</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Prefix</span>
        <input
          type="text"
          value={settings.prefix}
          placeholder="Optional"
          onChange={(event) => onChange({ prefix: event.target.value })}
        />
      </label>
      <StationingToggle
        label="White text halo"
        checked={settings.labelHalo}
        onChange={(labelHalo) => onChange({ labelHalo })}
      />

    </>
  )
}