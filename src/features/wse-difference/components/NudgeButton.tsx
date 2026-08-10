import type { ReactNode } from 'react'

type NudgeButtonProps = {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick(): void
}

export function NudgeButton({
  label,
  icon,
  disabled = false,
  onClick,
}: NudgeButtonProps) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}
