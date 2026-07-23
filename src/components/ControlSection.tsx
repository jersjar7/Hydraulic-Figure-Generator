import type { PropsWithChildren, ReactNode } from 'react'

type ControlSectionProps = PropsWithChildren<{
  icon: ReactNode
  title: string
  badge?: string
}>

export function ControlSection({
  icon,
  title,
  badge,
  children,
}: ControlSectionProps) {
  return (
    <details className="control-section">
      <summary>
        <span className="section-icon">{icon}</span>
        <span>{title}</span>
        {badge ? <span className="section-badge">{badge}</span> : null}
      </summary>
      <div className="control-section-body">{children}</div>
    </details>
  )
}
