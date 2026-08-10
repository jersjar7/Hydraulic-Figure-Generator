import type { ReactNode } from 'react'

type Props = {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick(): void
}

export function AnnotationNudgeButton({
  label,
  icon,
  disabled = false,
  onClick,
}: Props) {
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
