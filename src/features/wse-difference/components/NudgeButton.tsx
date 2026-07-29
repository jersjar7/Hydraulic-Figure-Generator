import type { ReactNode } from 'react'

type NudgeButtonProps = {
  label: string
  icon: ReactNode
  onClick(): void
}

export function NudgeButton({
  label,
  icon,
  onClick,
}: NudgeButtonProps) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}
