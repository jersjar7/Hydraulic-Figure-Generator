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
        Single Figure
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'set'}
        className={value === 'set' ? 'active' : ''}
        onClick={() => onChange('set')}
      >
        <LayoutGrid size={15} aria-hidden="true" />
        Batch Figures
      </button>
      {value === 'document' ? (
        <span className="production-mode-context" aria-label="Quick Word Export">
          <FileText size={14} aria-hidden="true" />
          Quick Word Export
        </span>
      ) : null}
    </div>
  )
}
