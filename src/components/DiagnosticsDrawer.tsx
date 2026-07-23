import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import type { IngestNotice } from '../core/types'

type DiagnosticsDrawerProps = {
  notices: IngestNotice[]
  open: boolean
  onToggle(): void
}

export function DiagnosticsDrawer({
  notices,
  open,
  onToggle,
}: DiagnosticsDrawerProps) {
  const issueCount = notices.filter((notice) => notice.level !== 'success').length
  return (
    <aside className={`diagnostics${open ? ' is-open' : ''}`} aria-live="polite">
      <button
        type="button"
        className="diagnostics-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {issueCount > 0 ? (
          <AlertTriangle aria-hidden="true" size={16} />
        ) : (
          <CheckCircle2 aria-hidden="true" size={16} />
        )}
        <span>
          Diagnostics
          {notices.length > 0 ? ` (${notices.length})` : ''}
        </span>
        {open ? (
          <ChevronDown aria-hidden="true" size={16} />
        ) : (
          <ChevronUp aria-hidden="true" size={16} />
        )}
      </button>
      {open ? (
        <div className="diagnostics-list">
          {notices.length === 0 ? (
            <p>No messages yet. Input checks will remain available here.</p>
          ) : (
            notices.map((notice, index) => (
              <div className={`diagnostic-row ${notice.level}`} key={`${notice.text}-${index}`}>
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
      ) : null}
    </aside>
  )
}
