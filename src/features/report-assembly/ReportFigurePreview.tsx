import { LoaderCircle, SquarePen, Trash2, X } from 'lucide-react'
import type { ReportFigureArtifact } from '../../core/types'

type Props = {
  figure: ReportFigureArtifact
  onChange(update: { title?: string; caption?: string }): void
  onOpenDraft(): void
  opening: boolean
  openError: string
  onRemove(): void
  onClose(): void
}

export function ReportFigurePreview({
  figure,
  onChange,
  onOpenDraft,
  opening,
  openError,
  onRemove,
  onClose,
}: Props) {
  const unavailableId = `editable-source-unavailable-${figure.id}`
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
          {openError ? <p className="report-preview-error" role="alert">{openError}</p> : null}
          {!figure.workspaceDraft ? (
            <p className="report-preview-draft-status" id={unavailableId}>
              Editable source is unavailable for this legacy figure.
            </p>
          ) : null}
          <div className="report-preview-actions">
            <button
              className="button primary compact"
              type="button"
              disabled={!figure.workspaceDraft || opening}
              aria-describedby={!figure.workspaceDraft ? unavailableId : undefined}
              title={figure.workspaceDraft
                ? `Use this figure as a starting point in ${figure.workspaceLabel}`
                : 'This legacy figure has no editable workspace draft'}
              onClick={onOpenDraft}
            >
              {opening
                ? <LoaderCircle className="spin" size={15} />
                : <SquarePen size={15} />}
              {opening ? 'Opening' : 'Use as starting point'}
            </button>
            <button className="button danger-outline compact" type="button" disabled={opening} onClick={onRemove}><Trash2 size={15} /> Remove figure</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
