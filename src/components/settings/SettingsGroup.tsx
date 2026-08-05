import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  title: string
}>

export function SettingsGroup({ title, children }: Props) {
  return (
    <section className="settings-group">
      <h3>{title}</h3>
      <div className="settings-group-content">{children}</div>
    </section>
  )
}
