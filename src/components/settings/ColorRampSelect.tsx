import { ChevronDown, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  COLOR_RAMP_CATALOG,
  COLOR_RAMP_OPTIONS,
  colorRampGradient,
  type ColorRampDefinition,
  type ColorRampKey,
} from '../../core/colorRamps'

type Props = {
  label?: string
  value: ColorRampKey
  defaultRamp: ColorRampKey
  options?: readonly ColorRampDefinition[]
  onChange(value: ColorRampKey): void
}

export function ColorRampSelect({
  label = 'Color ramp',
  value,
  defaultRamp,
  options = COLOR_RAMP_OPTIONS,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = COLOR_RAMP_CATALOG[value]

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="field color-ramp-field" ref={rootRef}>
      <span>{label}</span>
      <div className="color-ramp-control">
        <button
          type="button"
          className="color-ramp-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selected.label}</span>
          <span
            className="color-ramp-swatch"
            style={{ background: colorRampGradient(value) }}
            aria-hidden="true"
          />
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        {value !== defaultRamp ? (
          <button
            type="button"
            className="icon-button color-ramp-reset"
            title={`Reset to ${COLOR_RAMP_CATALOG[defaultRamp].label}`}
            aria-label={`Reset color ramp to ${COLOR_RAMP_CATALOG[defaultRamp].label}`}
            onClick={() => onChange(defaultRamp)}
          >
            <RotateCcw size={14} />
          </button>
        ) : null}
        {open ? (
          <div className="color-ramp-menu" id={listId} role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.key === value}
                className="color-ramp-option"
                key={option.key}
                onClick={() => {
                  onChange(option.key)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
                <small>{option.source}</small>
                <span
                  className="color-ramp-swatch"
                  style={{ background: colorRampGradient(option.key) }}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
