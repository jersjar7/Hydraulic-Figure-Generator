import type { ReactNode } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { ColorRampSelect } from '../../components/settings/ColorRampSelect'
import { CompactFieldGrid } from '../../components/settings/CompactFieldGrid'
import { SettingsGroup } from '../../components/settings/SettingsGroup'
import { Toggle } from '../../components/settings/Toggle'
import type {
  ColorRampDefinition,
  ColorRampKey,
} from '../../core/colorRamps'
import { cartographyValidationIssues } from '../../core/cartography'
import type {
  CartographySettings,
  StrokePattern,
} from '../../core/types'

type Props = {
  value: CartographySettings
  defaultRamp: ColorRampKey
  rampOptions?: readonly ColorRampDefinition[]
  units?: string
  showClassification?: boolean
  children?: ReactNode
  onChange(value: CartographySettings): void
}

const optionalNumber = (value: string) => {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

const lineWidth = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(0.25, parsed) : fallback
}

function PatternSelect({
  value,
  onChange,
}: {
  value: StrokePattern
  onChange(value: StrokePattern): void
}) {
  return (
    <label className="field">
      <span>Pattern</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as StrokePattern)}
      >
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
        <option value="dotted">Dotted</option>
      </select>
    </label>
  )
}

export function CartographyPanel({
  value,
  defaultRamp,
  rampOptions,
  units,
  showClassification = true,
  children,
  onChange,
}: Props) {
  const updateClassification = (
    classification: CartographySettings['classification'],
  ) => onChange({ ...value, classification })
  const updateContours = (
    contours: NonNullable<CartographySettings['contours']>,
  ) => onChange({ ...value, contours })
  const updateMesh = (mesh: NonNullable<CartographySettings['mesh']>) =>
    onChange({ ...value, mesh })
  const issues = cartographyValidationIssues(value)
  const unitLabel = units ? ` ${units}` : ''

  return (
    <ControlSection>
      {showClassification ? (
        <SettingsGroup title="Classification">
          <ColorRampSelect
            value={value.classification.ramp}
            defaultRamp={defaultRamp}
            options={rampOptions}
            onChange={(ramp) => updateClassification({
              ...value.classification,
              ramp,
            })}
          />
          {value.classification.bounds.mode === 'symmetric' ? (
            <CompactFieldGrid>
              <label className="field">
                <span>Bound <small>±{unitLabel}</small></span>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  placeholder="Auto"
                  value={value.classification.bounds.bound ?? ''}
                  onChange={(event) => updateClassification({
                    ...value.classification,
                    bounds: {
                      mode: 'symmetric',
                      bound: optionalNumber(event.currentTarget.value),
                    },
                  })}
                />
              </label>
              <label className="field">
                <span>Class interval <small>{units}</small></span>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  placeholder="Auto"
                  value={value.classification.interval ?? ''}
                  onChange={(event) => updateClassification({
                    ...value.classification,
                    interval: optionalNumber(event.currentTarget.value),
                  })}
                />
              </label>
            </CompactFieldGrid>
          ) : (
            <CompactFieldGrid columns={3}>
              <label className="field">
                <span>Minimum <small>{units}</small></span>
                <input
                  type="number"
                  step="any"
                  placeholder="Auto"
                  value={value.classification.bounds.minimum ?? ''}
                  onChange={(event) => updateClassification({
                    ...value.classification,
                    bounds: {
                      mode: 'range',
                      minimum: optionalNumber(event.currentTarget.value),
                      maximum: value.classification.bounds.mode === 'range'
                        ? value.classification.bounds.maximum
                        : null,
                    },
                  })}
                />
              </label>
              <label className="field">
                <span>Maximum <small>{units}</small></span>
                <input
                  type="number"
                  step="any"
                  placeholder="Auto"
                  value={value.classification.bounds.maximum ?? ''}
                  onChange={(event) => updateClassification({
                    ...value.classification,
                    bounds: {
                      mode: 'range',
                      minimum: value.classification.bounds.mode === 'range'
                        ? value.classification.bounds.minimum
                        : null,
                      maximum: optionalNumber(event.currentTarget.value),
                    },
                  })}
                />
              </label>
              <label className="field">
                <span>Class interval <small>{units}</small></span>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  placeholder="Auto"
                  value={value.classification.interval ?? ''}
                  onChange={(event) => updateClassification({
                    ...value.classification,
                    interval: optionalNumber(event.currentTarget.value),
                  })}
                />
              </label>
            </CompactFieldGrid>
          )}
        </SettingsGroup>
      ) : null}
      {value.contours ? (
        <SettingsGroup title="Contours">
          <Toggle
            label={value.contours.mode === 'class-boundaries'
              ? 'Class boundary outlines'
              : 'Scalar isolines'}
            checked={value.contours.visible}
            onChange={(visible) => updateContours({ ...value.contours!, visible })}
          />
          {value.contours.visible ? (
            <CompactFieldGrid columns={3}>
              {value.contours.mode === 'scalar-isolines' ? (
                <label className="field">
                  <span>Contour interval <small>{units}</small></span>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="Auto"
                    value={value.contours.interval ?? ''}
                    onChange={(event) => updateContours({
                      ...value.contours!,
                      interval: optionalNumber(event.currentTarget.value),
                    })}
                  />
                </label>
              ) : null}
              <label className="field color-field">
                <span>Color</span>
                <input
                  type="color"
                  value={value.contours.color}
                  onChange={(event) => updateContours({
                    ...value.contours!,
                    color: event.currentTarget.value,
                  })}
                />
              </label>
              <label className="field">
                <span>Width <small>px</small></span>
                <input
                  type="number"
                  min="0.25"
                  max="8"
                  step="0.25"
                  value={value.contours.width}
                  onChange={(event) => updateContours({
                    ...value.contours!,
                    width: lineWidth(event.currentTarget.value, value.contours!.width),
                  })}
                />
              </label>
              <PatternSelect
                value={value.contours.pattern}
                onChange={(pattern) => updateContours({ ...value.contours!, pattern })}
              />
            </CompactFieldGrid>
          ) : null}
        </SettingsGroup>
      ) : null}
      {value.mesh ? (
        <SettingsGroup title="Mesh">
          <CompactFieldGrid columns={3}>
            <label className="field color-field">
              <span>Color</span>
              <input
                type="color"
                value={value.mesh.color}
                onChange={(event) => updateMesh({
                  ...value.mesh!,
                  color: event.currentTarget.value,
                })}
              />
            </label>
            <label className="field">
              <span>Width <small>px</small></span>
              <input
                type="number"
                min="0.25"
                max="8"
                step="0.25"
                value={value.mesh.width}
                onChange={(event) => updateMesh({
                  ...value.mesh!,
                  width: lineWidth(event.currentTarget.value, value.mesh!.width),
                })}
              />
            </label>
            <PatternSelect
              value={value.mesh.pattern}
              onChange={(pattern) => updateMesh({ ...value.mesh!, pattern })}
            />
            <label className="field">
              <span>Opacity</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={value.mesh.opacity}
                onChange={(event) => updateMesh({
                  ...value.mesh!,
                  opacity: Number(event.currentTarget.value),
                })}
              />
            </label>
          </CompactFieldGrid>
        </SettingsGroup>
      ) : null}
      {children}
      {issues.length > 0 ? (
        <p className="field-help" role="alert">{issues[0]}</p>
      ) : null}
    </ControlSection>
  )
}
