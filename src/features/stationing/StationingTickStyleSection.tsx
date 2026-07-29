import type { CenterlineStationingSettings } from '../../core/types'
import { StationingSectionHeading } from './stationingControls'
import { stationingNumberValue } from './stationingValues'

type Props = {
  settings: CenterlineStationingSettings
  onChange(patch: Partial<CenterlineStationingSettings>): void
}

export function StationingTickStyleSection({ settings, onChange }: Props) {
  return (
    <>
      <StationingSectionHeading>Ticks</StationingSectionHeading>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Color</span>
          <input
            type="color"
            value={settings.tickColor}
            onChange={(event) => onChange({ tickColor: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Side</span>
          <select
            value={settings.tickSide}
            onChange={(event) =>
              onChange({
                tickSide: event.target
                  .value as CenterlineStationingSettings['tickSide'],
              })
            }
          >
            <option value="both">Both sides</option>
            <option value="left">Left only</option>
            <option value="right">Right only</option>
          </select>
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Minor length <small>px</small>
          </span>
          <input
            type="number"
            min="1"
            max="100"
            value={settings.minorTickLength}
            onChange={(event) =>
              onChange({
                minorTickLength: stationingNumberValue(
                  event.target.value,
                  settings.minorTickLength,
                ),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Major length <small>px</small>
          </span>
          <input
            type="number"
            min="1"
            max="160"
            value={settings.majorTickLength}
            onChange={(event) =>
              onChange({
                majorTickLength: stationingNumberValue(
                  event.target.value,
                  settings.majorTickLength,
                ),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Minor width <small>px</small>
          </span>
          <input
            type="number"
            min="0.25"
            max="12"
            step="0.25"
            value={settings.minorLineWidth}
            onChange={(event) =>
              onChange({
                minorLineWidth: stationingNumberValue(
                  event.target.value,
                  settings.minorLineWidth,
                ),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Major width <small>px</small>
          </span>
          <input
            type="number"
            min="0.25"
            max="16"
            step="0.25"
            value={settings.majorLineWidth}
            onChange={(event) =>
              onChange({
                majorLineWidth: stationingNumberValue(
                  event.target.value,
                  settings.majorLineWidth,
                ),
              })
            }
          />
        </label>
      </div>

    </>
  )
}