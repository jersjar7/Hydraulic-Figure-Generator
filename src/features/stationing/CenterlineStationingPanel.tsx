import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from 'lucide-react'
import { formatStation } from '../../core/centerlineStationing'
import type {
  CenterlineStationingSettings,
  CenterlineStationTick,
  StationLabelOverride,
} from '../../core/types'

type Props = {
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
  onReset(): void
}

function numberValue(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function Toggle({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange(value: boolean): void
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

function SectionHeading({ children }: { children: string }) {
  return <h4 className="element-settings-heading">{children}</h4>
}

export function CenterlineStationingPanel({
  settings,
  ticks,
  selectedLabelId,
  hasCenterline,
  onChange,
  onSelectLabel,
  onOverrideChange,
  onNudgeSelected,
  onReset,
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
    <div className="stationing-settings">
      <div className="stationing-top-actions">
        <Toggle
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
          Select a hydraulic centerline in Project data, then return here to
          style its station ticks.
        </p>
      ) : null}

      <SectionHeading>Preset</SectionHeading>
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

      <SectionHeading>Visibility</SectionHeading>
      <div className="field-grid two stationing-toggle-grid">
        <Toggle
          label="Minor ticks"
          checked={settings.showMinorTicks}
          onChange={(showMinorTicks) => onChange({ showMinorTicks })}
        />
        <Toggle
          label="Major ticks"
          checked={settings.showMajorTicks}
          onChange={(showMajorTicks) => onChange({ showMajorTicks })}
        />
        <Toggle
          label="Station labels"
          checked={settings.showLabels}
          onChange={(showLabels) => onChange({ showLabels })}
        />
        <Toggle
          label="A / B endpoints"
          checked={settings.showEndpoints}
          onChange={(showEndpoints) => onChange({ showEndpoints })}
        />
      </div>
      <Toggle
        label="Increasing-station arrow"
        checked={settings.showDirectionArrow}
        onChange={(showDirectionArrow) => onChange({ showDirectionArrow })}
      />

      <SectionHeading>Intervals</SectionHeading>
      <div className="field-grid three">
        <label className="field">
          <span>
            Minor <small>ft</small>
          </span>
          <input
            type="number"
            min="0.01"
            step="1"
            value={settings.minorInterval}
            onChange={(event) =>
              onChange({
                minorInterval: Math.max(
                  0.01,
                  numberValue(event.target.value, settings.minorInterval),
                ),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Major <small>ft</small>
          </span>
          <input
            type="number"
            min="0.01"
            step="1"
            value={settings.majorInterval}
            onChange={(event) =>
              onChange({
                majorInterval: Math.max(
                  0.01,
                  numberValue(event.target.value, settings.majorInterval),
                ),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Labels <small>ft</small>
          </span>
          <input
            type="number"
            min="0.01"
            step="1"
            value={settings.labelInterval}
            onChange={(event) =>
              onChange({
                labelInterval: Math.max(
                  0.01,
                  numberValue(event.target.value, settings.labelInterval),
                ),
              })
            }
          />
        </label>
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
              onChange({ rangeStart: nullableNumber(event.target.value) })
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
              onChange({ rangeEnd: nullableNumber(event.target.value) })
            }
          />
        </label>
      </div>

      <SectionHeading>Ticks</SectionHeading>
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
                minorTickLength: numberValue(
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
                majorTickLength: numberValue(
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
                minorLineWidth: numberValue(
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
                majorLineWidth: numberValue(
                  event.target.value,
                  settings.majorLineWidth,
                ),
              })
            }
          />
        </label>
      </div>

      <SectionHeading>Labels</SectionHeading>
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
                labelFontSize: numberValue(
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
                labelOffset: numberValue(
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
      <Toggle
        label="White text halo"
        checked={settings.labelHalo}
        onChange={(labelHalo) => onChange({ labelHalo })}
      />

      <SectionHeading>Individual label</SectionHeading>
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
          <Toggle
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
              <button
                className="icon-button tiny"
                type="button"
                title="Move label left"
                aria-label="Move label left"
                onClick={() => onNudgeSelected(-10, 0)}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className="icon-button tiny"
                type="button"
                title="Move label up"
                aria-label="Move label up"
                onClick={() => onNudgeSelected(0, -10)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-button tiny"
                type="button"
                title="Move label down"
                aria-label="Move label down"
                onClick={() => onNudgeSelected(0, 10)}
              >
                <ArrowDown size={14} />
              </button>
              <button
                className="icon-button tiny"
                type="button"
                title="Move label right"
                aria-label="Move label right"
                onClick={() => onNudgeSelected(10, 0)}
              >
                <ArrowRight size={14} />
              </button>
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
          Click a station label on the canvas to edit or drag it.
        </p>
      )}
    </div>
  )
}
