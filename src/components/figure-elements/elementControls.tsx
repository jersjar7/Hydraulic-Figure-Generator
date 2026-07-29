import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  Anchor,
  ElementBoxStyle,
  ElementPosition,
} from '../../core/types'
import { ELEMENT_ANCHORS } from './elementDefinitions'
import { numberValue } from './numberValue'

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(value: boolean): void
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

export function SectionHeading({ children }: { children: string }) {
  return <h4 className="element-settings-heading">{children}</h4>
}

export function BoxControls({
  style,
  onChange,
}: {
  style: ElementBoxStyle
  onChange(patch: Partial<ElementBoxStyle>): void
}) {
  return (
    <>
      <Toggle
        label="Background"
        checked={style.background}
        onChange={(background) => onChange({ background })}
      />
      <div className="field-grid two">
        <label className="field color-field">
          <span>Background</span>
          <input
            type="color"
            value={style.backgroundColor}
            disabled={!style.background}
            onChange={(event) =>
              onChange({ backgroundColor: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>
            Opacity <small>{Math.round(style.backgroundOpacity * 100)}%</small>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={style.backgroundOpacity}
            disabled={!style.background}
            onChange={(event) =>
              onChange({
                backgroundOpacity: numberValue(event.target.value, 0.88),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Border</span>
          <input
            type="color"
            value={style.borderColor}
            onChange={(event) => onChange({ borderColor: event.target.value })}
          />
        </label>
        <label className="field">
          <span>
            Border width <small>px</small>
          </span>
          <input
            type="number"
            min="0"
            max="8"
            step="0.5"
            value={style.borderWidth}
            onChange={(event) =>
              onChange({ borderWidth: numberValue(event.target.value, 1) })
            }
          />
        </label>
      </div>
    </>
  )
}

export function PositionControls({
  position,
  label,
  onChange,
  onNudge,
}: {
  position: ElementPosition
  label: string
  onChange(patch: Partial<ElementPosition>): void
  onNudge(dx: number, dy: number): void
}) {
  return (
    <>
      <label className="field">
        <span>Anchor</span>
        <select
          value={position.anchor}
          onChange={(event) =>
            onChange({ anchor: event.target.value as Anchor })
          }
        >
          {ELEMENT_ANCHORS.map((anchor) => (
            <option value={anchor.value} key={anchor.value}>
              {anchor.label}
            </option>
          ))}
        </select>
      </label>
      <div className="element-position-row">
        <span>
          Offset <small>{position.offX}, {position.offY} px</small>
        </span>
        <div className="nudge-buttons">
          <NudgeButton
            label={`Move ${label} left`}
            onClick={() => onNudge(-10, 0)}
          >
            <ArrowLeft size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} up`}
            onClick={() => onNudge(0, -10)}
          >
            <ArrowUp size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} down`}
            onClick={() => onNudge(0, 10)}
          >
            <ArrowDown size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} right`}
            onClick={() => onNudge(10, 0)}
          >
            <ArrowRight size={14} />
          </NudgeButton>
        </div>
      </div>
    </>
  )
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
