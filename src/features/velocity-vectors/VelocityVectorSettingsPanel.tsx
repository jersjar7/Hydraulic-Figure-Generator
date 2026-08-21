import { ControlSection } from '../../components/ControlSection'
import { CompactFieldGrid } from '../../components/settings/CompactFieldGrid'
import { SettingsGroup } from '../../components/settings/SettingsGroup'
import { Toggle } from '../../components/settings/Toggle'
import type { VelocityVectorSettings } from '../../core/types'

type Props = {
  value: VelocityVectorSettings
  available: boolean
  onChange(value: VelocityVectorSettings): void
}

function positive(value: string, fallback: number, minimum = 0) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback
}

export function VelocityVectorSettingsPanel({
  value,
  available,
  onChange,
}: Props) {
  const update = (patch: Partial<VelocityVectorSettings>) =>
    onChange({ ...value, ...patch })

  return (
    <ControlSection>
      <SettingsGroup title="Velocity vectors">
        <Toggle
          label="Show velocity arrows"
          checked={value.visible && available}
          disabled={!available}
          onChange={(visible) => update({ visible })}
        />
        {!available ? (
          <p className="field-help">
            The selected run does not include a node-based Velocity_ft_p_s
            vector dataset.
          </p>
        ) : null}
        {available && value.visible ? (
          <>
            <div className="segmented" role="group" aria-label="Arrow length mode">
              <button
                className={value.lengthMode === 'uniform' ? 'active' : ''}
                type="button"
                onClick={() => update({ lengthMode: 'uniform' })}
              >
                Uniform
              </button>
              <button
                className={value.lengthMode === 'scaled' ? 'active' : ''}
                type="button"
                onClick={() => update({ lengthMode: 'scaled' })}
              >
                Scale by speed
              </button>
            </div>
            <CompactFieldGrid columns={3}>
              <label className="field">
                <span>Spacing <small>px</small></span>
                <input
                  type="number"
                  min="8"
                  step="1"
                  value={value.spacing}
                  onChange={(event) => update({
                    spacing: positive(event.currentTarget.value, value.spacing, 8),
                  })}
                />
              </label>
              <label className="field">
                <span>Length <small>px</small></span>
                <input
                  type="number"
                  min="4"
                  step="1"
                  value={value.length}
                  onChange={(event) => update({
                    length: positive(event.currentTarget.value, value.length, 4),
                  })}
                />
              </label>
              <label className="field">
                <span>Minimum <small>ft/s</small></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value.minimumMagnitude}
                  onChange={(event) => update({
                    minimumMagnitude: positive(
                      event.currentTarget.value,
                      value.minimumMagnitude,
                    ),
                  })}
                />
              </label>
              <label className="field color-field">
                <span>Color</span>
                <input
                  type="color"
                  value={value.color}
                  onChange={(event) => update({ color: event.currentTarget.value })}
                />
              </label>
              <label className="field">
                <span>Width <small>px</small></span>
                <input
                  type="number"
                  min="0.5"
                  max="8"
                  step="0.25"
                  value={value.lineWidth}
                  onChange={(event) => update({
                    lineWidth: positive(
                      event.currentTarget.value,
                      value.lineWidth,
                      0.5,
                    ),
                  })}
                />
              </label>
              <label className="field">
                <span>Arrowhead <small>px</small></span>
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={value.headSize}
                  onChange={(event) => update({
                    headSize: positive(event.currentTarget.value, value.headSize, 2),
                  })}
                />
              </label>
            </CompactFieldGrid>
          </>
        ) : null}
      </SettingsGroup>
    </ControlSection>
  )
}
