import { Toggle } from '../../components/settings/Toggle'
import type { LongitudinalStationingSettings } from '../../core/types'

type Props = {
  settings: LongitudinalStationingSettings
  onChange(settings: LongitudinalStationingSettings): void
}

export function LongitudinalStationingControls({ settings, onChange }: Props) {
  const update = <Key extends keyof LongitudinalStationingSettings>(
    key: Key,
    value: LongitudinalStationingSettings[Key],
  ) => onChange({ ...settings, [key]: value })

  return (
    <>
      <label className="field">
        <span>Initial station (ft)</span>
        <input
          type="number"
          step="1"
          value={settings.initialStation ?? ''}
          placeholder="Auto from Summary Table"
          onChange={(event) => {
            const value = event.currentTarget.value
            update('initialStation', value === '' ? null : Number(value))
          }}
        />
      </label>
      <label className="field">
        <span>Station-label placement</span>
        <select
          value={settings.labelPlacement}
          onChange={(event) => update(
            'labelPlacement',
            event.currentTarget.value as LongitudinalStationingSettings['labelPlacement'],
          )}
        >
          <option value="auto">Automatic</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
      <Toggle
        label="Prevent station-label overlap"
        checked={settings.avoidLabelOverlap}
        onChange={(value) => update('avoidLabelOverlap', value)}
      />
      <Toggle
        label="Stagger labels left/right"
        checked={settings.staggerLabels}
        onChange={(value) => update('staggerLabels', value)}
      />
      {Object.keys(settings.labelPositions).length > 0 ? (
        <button
          className="button secondary full"
          type="button"
          onClick={() => update('labelPositions', {})}
        >
          Reset moved labels
        </button>
      ) : null}
    </>
  )
}
