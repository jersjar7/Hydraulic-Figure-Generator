import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  columns?: 2 | 3
}>

export function CompactFieldGrid({ columns = 2, children }: Props) {
  return (
    <div className={`compact-field-grid columns-${columns}`}>
      {children}
    </div>
  )
}
