import type { CenterlineStationingSettings } from '../../core/types'
import { StationingSectionHeading } from './stationingControls'
import {
  nullableStationingNumber,
  stationingNumberValue,
} from './stationingValues'

type Props = {
  settings: CenterlineStationingSettings
  onChange(patch: Partial<CenterlineStationingSettings>): void
}

export function StationingIntervalsSection({ settings, onChange }: Props) {
  return (
    <>
      <StationingSectionHeading>Intervals</StationingSectionHeading>
      <div className="field-grid three">
        {[
          ['Minor', 'minorInterval'],
          ['Major', 'majorInterval'],
          ['Labels', 'labelInterval'],
        ].map(([label, key]) => (
          <label className="field" key={key}>
            <span>
              {label} <small>ft</small>
            </span>
            <input
              type="number"
              min="0.01"
              step="1"
              value={settings[key as 'minorInterval']}
              onChange={(event) =>
                onChange({
                  [key]: Math.max(
                    0.01,
                    stationingNumberValue(
                      event.target.value,
                      settings[key as 'minorInterval'],
                    ),
                  ),
                })
              }
            />
          </label>
        ))}
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Range from <small>auto</small>
          </span>
          <input
            type="number"
            step="1"
            placeholder="Full centerline"
            value={settings.rangeStart ?? ''}
            onChange={(event) =>
              onChange({
                rangeStart: nullableStationingNumber(event.target.value),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Range to <small>auto</small>
          </span>
          <input
            type="number"
            step="1"
            placeholder="Full centerline"
            value={settings.rangeEnd ?? ''}
            onChange={(event) =>
              onChange({
                rangeEnd: nullableStationingNumber(event.target.value),
              })
            }
          />
        </label>
      </div>
    </>
  )
}
