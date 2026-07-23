import { useId, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from 'lucide-react'
import type { IngestNotice } from '../core/types'
import './DiagnosticsWidget.css'

type DiagnosticsWidgetProps = {
  notices: IngestNotice[]
}

export function DiagnosticsWidget({ notices }: DiagnosticsWidgetProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const issueCount = notices.filter(
    (notice) => notice.level !== 'success',
  ).length
  const countLabel =
    notices.length === 1 ? '1 message' : `${notices.length} messages`
  const triggerTitle = open
    ? 'Minimize diagnostics'
    : `Open diagnostics (${countLabel})`

  return (
    <aside
      className={`diagnostics-widget${open ? ' is-open' : ''}${issueCount > 0 ? ' has-issues' : ''}`}
    >
      <span className="visually-hidden" role="status" aria-live="polite">
        Diagnostics: {countLabel}
        {issueCount > 0
          ? `, ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`
          : ''}
      </span>
      <div className="diagnostics-list" id={listId} hidden={!open}>
        {notices.length === 0 ? (
          <p>No messages yet. Input checks will remain available here.</p>
        ) : (
          notices.map((notice, index) => (
            <div
              className={`diagnostic-row ${notice.level}`}
              key={`${notice.text}-${index}`}
            >
              {notice.level === 'error' ? (
                <XCircle aria-hidden="true" size={15} />
              ) : notice.level === 'warning' ? (
                <AlertTriangle aria-hidden="true" size={15} />
              ) : (
                <CheckCircle2 aria-hidden="true" size={15} />
              )}
              <span>{notice.text}</span>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        className="diagnostics-trigger"
        title={triggerTitle}
        aria-label={triggerTitle}
        aria-controls={listId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {issueCount > 0 ? (
          <AlertTriangle
            className="diagnostics-status-icon"
            aria-hidden="true"
            size={17}
          />
        ) : (
          <CheckCircle2
            className="diagnostics-status-icon"
            aria-hidden="true"
            size={17}
          />
        )}
        <span className="diagnostics-trigger-label">
          Diagnostics{notices.length > 0 ? ` (${notices.length})` : ''}
        </span>
        <ChevronRight
          className="diagnostics-chevron"
          aria-hidden="true"
          size={17}
        />
      </button>
    </aside>
  )
}
