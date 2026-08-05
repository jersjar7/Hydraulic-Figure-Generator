import { Trash2, X } from 'lucide-react'
import type { ReportFigureArtifact } from '../../core/types'

type Props = {
  figure: ReportFigureArtifact
  onChange(update: { title?: string; caption?: string }): void
  onRemove(): void
  onClose(): void
}

export function ReportFigurePreview({
  figure,
  onChange,
  onRemove,
  onClose,
}: Props) {
  return (
    <div className="report-preview-scrim" role="presentation" onMouseDown={onClose}>
      <section className="report-preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview ${figure.title}`} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">Figure preview</span><strong>{figure.workspaceLabel}</strong></div>
          <button className="icon-button" type="button" title="Close preview" aria-label="Close preview" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="report-preview-image"><img src={figure.imageDataUrl} alt={figure.title} /></div>
        <footer>
          <label className="field"><span>Figure title</span><input value={figure.title} onChange={(event) => onChange({ title: event.currentTarget.value })} /></label>
          <label className="field"><span>Caption</span><textarea value={figure.caption} onChange={(event) => onChange({ caption: event.currentTarget.value })} /></label>
          <button className="button danger-outline compact" type="button" onClick={onRemove}><Trash2 size={15} /> Remove figure</button>
        </footer>
      </section>
    </div>
  )
}
