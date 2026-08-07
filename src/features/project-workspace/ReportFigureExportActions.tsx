import { CopyPlus, Images, RefreshCw, Unlink } from 'lucide-react'
import { useState } from 'react'
import type {
  NewReportFigure,
  ReportFigureArtifact,
} from '../../core/types'
import type { FigureId } from '../figures/workspaceRegistry'
import {
  reportFigureSaveMessage,
  type ReportFigureSaveAction,
} from './reportFigureExport'
import { useReportFigureExport } from './useReportFigureExport'

type Props = {
  workspaceId: FigureId
  canExport: boolean
  createFigure(): NewReportFigure | null
  addLabel?: string
  addVariant?: 'primary' | 'secondary'
  onSaved?(figure: ReportFigureArtifact, action: ReportFigureSaveAction): void
  onSuccess?(message: string): void
}

export function ReportFigureExportActions({
  workspaceId,
  canExport,
  createFigure,
  addLabel = 'Add to export',
  addVariant = 'primary',
  onSaved,
  onSuccess,
}: Props) {
  const editor = useReportFigureExport(workspaceId)
  const [error, setError] = useState('')

  const save = (action: 'update' | 'new') => {
    try {
      setError('')
      const input = createFigure()
      if (!input) return
      if (action === 'update') {
        const figure = editor.update(input)
        onSaved?.(figure, 'updated')
        onSuccess?.(reportFigureSaveMessage(figure, 'updated'))
        return
      }
      const wasEditing = Boolean(editor.target)
      const figure = editor.saveAsNew(input)
      const savedAction = wasEditing ? 'duplicated' : 'added'
      onSaved?.(figure, savedAction)
      onSuccess?.(reportFigureSaveMessage(figure, savedAction))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <div className="report-figure-export-actions">
      {editor.target ? (
        <>
          <div className="report-figure-edit-target">
            <span>
              <small>Editing export</small>
              <strong title={editor.target.title}>{editor.target.title}</strong>
            </span>
            <button
              className="icon-button compact"
              type="button"
              title="Stop editing this exported figure"
              aria-label="Stop editing this exported figure"
              onClick={editor.unlink}
            >
              <Unlink size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="report-figure-edit-actions">
            <button
              className="button primary"
              type="button"
              disabled={!canExport}
              onClick={() => save('update')}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Update exported figure
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={!canExport}
              onClick={() => save('new')}
            >
              <CopyPlus size={16} aria-hidden="true" />
              Save as new figure
            </button>
          </div>
        </>
      ) : (
        <button
          className={`button ${addVariant} full`}
          type="button"
          disabled={!canExport}
          onClick={() => save('new')}
        >
          <Images size={17} aria-hidden="true" />
          {addLabel}
        </button>
      )}
      {error ? <div className="report-figure-export-error" role="alert">{error}</div> : null}
    </div>
  )
}
