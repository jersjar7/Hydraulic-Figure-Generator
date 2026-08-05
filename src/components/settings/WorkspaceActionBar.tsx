import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  label: string
  disabled?: boolean
  tone?: 'primary' | 'secondary'
  testId?: string
  hint?: string
  onClick(): void
}

export function WorkspaceActionBar({
  icon,
  label,
  disabled = false,
  tone = 'primary',
  testId,
  hint,
  onClick,
}: Props) {
  return (
    <div className="generate-bar workspace-action-bar">
      <button
        className={`button ${tone} full workspace-primary-action`}
        type="button"
        disabled={disabled}
        data-testid={testId}
        onClick={onClick}
      >
        {icon}
        <span>{label}</span>
      </button>
      {hint ? (
        <span className="generate-hint">
          <AlertCircle size={14} aria-hidden="true" />
          {hint}
        </span>
      ) : null}
    </div>
  )
}
