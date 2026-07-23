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
    <section className="control-section">
      <header className="control-section-header">
        <span className="section-icon">{icon}</span>
        <h3>{title}</h3>
        {badge ? <span className="section-badge">{badge}</span> : null}
      </header>
      <div className="control-section-body">{children}</div>
    </section>
  )
}
