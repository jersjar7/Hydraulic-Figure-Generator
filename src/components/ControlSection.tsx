import type { PropsWithChildren } from 'react'

export function ControlSection({
  children,
}: PropsWithChildren) {
  return (
    <section className="control-section">
      <div className="control-section-body">{children}</div>
    </section>
  )
}
