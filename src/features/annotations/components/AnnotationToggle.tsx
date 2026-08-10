type Props = {
  label: string
  checked: boolean
  disabled?: boolean
  onChange(checked: boolean): void
}

export function AnnotationToggle({
  label,
  checked,
  disabled = false,
  onChange,
}: Props) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  )
}
