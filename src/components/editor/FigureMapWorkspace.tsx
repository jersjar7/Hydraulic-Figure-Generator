import { RefreshCcw, ZoomIn, ZoomOut } from 'lucide-react'
import type { ReactNode } from 'react'
import type { IngestNotice } from '../../core/types'
import { DiagnosticsWidget } from '../DiagnosticsWidget'

type Props = {
  figureLabel: string
  comparisonDescription: string
  busy: boolean
  notices: IngestNotice[]
  onZoomOut(): void
  onZoomIn(): void
  onFitFrame(): void
  children: ReactNode
}

export function FigureMapWorkspace({
  figureLabel,
  comparisonDescription,
  busy,
  notices,
  onZoomOut,
  onZoomIn,
  onFitFrame,
  children,
}: Props) {
  return (
    <section className="map-workspace">
      <div className="map-toolbar">
        <div className="map-mode">
          <span className="mode-dot" />
          <strong>{figureLabel}</strong>
          <span>{comparisonDescription}</span>
        </div>
        <div className="map-toolbar-actions">
          <button
            className="icon-button"
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={onZoomOut}
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={onZoomIn}
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="Fit map to frame"
            aria-label="Fit map to frame"
            onClick={onFitFrame}
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="map-stage">
        {children}
        {busy ? (
          <div className="map-busy" role="status">
            <span className="spinner" />
            Processing figure
          </div>
        ) : null}
        <DiagnosticsWidget notices={notices} />
      </div>
    </section>
  )
}
