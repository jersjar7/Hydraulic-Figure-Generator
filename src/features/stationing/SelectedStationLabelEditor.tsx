import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { formatStation } from '../../core/centerlineStationing'
import type {
  CenterlineStationingSettings,
  CenterlineStationTick,
  StationLabelOverride,
} from '../../core/types'
import {
  StationingSectionHeading,
  StationingToggle,
} from './stationingControls'

const NUDGE_ACTIONS: Array<{
  direction: string
  dx: number
  dy: number
  Icon: LucideIcon
}> = [
  { direction: 'left', dx: -10, dy: 0, Icon: ArrowLeft },
  { direction: 'up', dx: 0, dy: -10, Icon: ArrowUp },
  { direction: 'down', dx: 0, dy: 10, Icon: ArrowDown },
  { direction: 'right', dx: 10, dy: 0, Icon: ArrowRight },
]

type Props = {
  settings: CenterlineStationingSettings
  ticks: CenterlineStationTick[]
  selectedLabelId: string | null
  onSelectLabel(id: string | null): void
  onOverrideChange(
    id: string,
    override: StationLabelOverride | null,
  ): void
  onNudgeSelected(dx: number, dy: number): void
}

export function SelectedStationLabelEditor({
  settings,
  ticks,
  selectedLabelId,
  onSelectLabel,
  onOverrideChange,
  onNudgeSelected,
}: Props) {
  const labels = ticks.filter((tick) => tick.label)
  const selected =
    labels.find((tick) => tick.id === selectedLabelId) ?? null
  const selectedOverride = selected
    ? settings.overrides[selected.id] ?? {}
    : null
  const selectedDefaultText = selected
    ? `${settings.prefix}${formatStation(
        selected.stationFeet,
        settings.decimalPlaces,
      )}`
    : ''

  return (
    <>
      <StationingSectionHeading>Individual label</StationingSectionHeading>
      <label className="field">
        <span>Station label</span>
        <select
          value={selectedLabelId ?? ''}
          disabled={labels.length === 0}
          onChange={(event) => onSelectLabel(event.target.value || null)}
        >
          <option value="">Select a station</option>
          {labels.map((tick) => (
            <option value={tick.id} key={tick.id}>
              {formatStation(tick.stationFeet, settings.decimalPlaces)}
              {settings.overrides[tick.id]?.visible === false
                ? ' (hidden)'
                : ''}
            </option>
          ))}
        </select>
      </label>
      {selected && selectedOverride ? (
        <div className="station-label-editor">
          <StationingToggle
            label="Show this label"
            checked={selectedOverride.visible !== false}
            onChange={(visible) =>
              onOverrideChange(selected.id, {
                ...selectedOverride,
                visible,
              })
            }
          />
          <label className="field">
            <span>Label text</span>
            <input
              type="text"
              value={selectedOverride.text ?? selectedDefaultText}
              onChange={(event) =>
                onOverrideChange(selected.id, {
                  ...selectedOverride,
                  text: event.target.value,
                })
              }
            />
          </label>
          <div className="station-label-actions">
            <span>Move selected</span>
            <div className="nudge-buttons">
              {NUDGE_ACTIONS.map(({ direction, dx, dy, Icon }) => (
                <button
                  className="icon-button tiny"
                  type="button"
                  title={`Move label ${direction}`}
                  aria-label={`Move label ${direction}`}
                  onClick={() => onNudgeSelected(dx, dy)}
                  key={direction}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          <button
            className="button secondary compact full"
            type="button"
            onClick={() => onOverrideChange(selected.id, null)}
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset this label
          </button>
        </div>
      ) : (
        <p className="empty-note">
          Choose a station label above to edit, hide, or move it.
        </p>
      )}
    </>
  )
}
