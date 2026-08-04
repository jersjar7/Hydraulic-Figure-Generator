import { FileText, Image, LayoutGrid } from 'lucide-react'

export type FigureProductionMode = 'figure' | 'set' | 'document'

type Props = {
  value: FigureProductionMode
  onChange(value: FigureProductionMode): void
}

export function FigureProductionModeSwitcher({ value, onChange }: Props) {
  return (
    <div
      className="production-mode-switcher"
      role="tablist"
      aria-label="Output view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'figure'}
        className={value === 'figure' ? 'active' : ''}
        onClick={() => onChange('figure')}
      >
        <Image size={15} aria-hidden="true" />
        Figure
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'set'}
        className={value === 'set' ? 'active' : ''}
        onClick={() => onChange('set')}
      >
        <LayoutGrid size={15} aria-hidden="true" />
        Figure Set
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'document'}
        className={value === 'document' ? 'active' : ''}
        onClick={() => onChange('document')}
      >
        <FileText size={15} aria-hidden="true" />
        Document
      </button>
    </div>
  )
}
