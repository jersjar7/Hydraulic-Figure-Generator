type ToggleProps = {
  label: string
  checked: boolean
  disabled?: boolean
  onChange(checked: boolean): void
}

export function Toggle({
  label,
  checked,
  disabled = false,
  onChange,
}: ToggleProps) {
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
