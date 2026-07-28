import { Layers3, X } from 'lucide-react'
import type { MapOverlay } from '../../core/types'
import { FileDrop } from '../FileDrop'

type LayersWorkspaceProps = {
  busy: boolean
  overlays: MapOverlay[]
  showOverlays: boolean
  onOverlayFiles(files: File[]): void
  onShowOverlaysChange(visible: boolean): void
  onUpdateOverlay(id: string, patch: Partial<MapOverlay>): void
  onRemoveOverlay(id: string): void
}

export function LayersWorkspace({
  busy,
  overlays,
  showOverlays,
  onOverlayFiles,
  onShowOverlaysChange,
  onUpdateOverlay,
  onRemoveOverlay,
}: LayersWorkspaceProps) {
  return (
    <section className="workflow-block">
      <div className="block-title">
        <Layers3 size={17} aria-hidden="true" />
        <span>Map overlays</span>
        <span className="file-chip">.zip</span>
      </div>
      <FileDrop
        accept=".zip"
        title="Add zipped shapefiles"
        description="Centerlines, ROW, project limits"
        disabled={busy}
        testId="overlay-file-drop"
        onFiles={onOverlayFiles}
      />
      {overlays.length > 0 ? (
        <label className="toggle-row">
          <span>Show shapefile overlays</span>
          <input
            type="checkbox"
            checked={showOverlays}
            onChange={(event) => onShowOverlaysChange(event.target.checked)}
          />
          <span className="toggle-track" aria-hidden="true">
            <span />
          </span>
        </label>
      ) : null}
      {overlays.length === 0 ? (
        <p className="empty-note">No shapefile overlays loaded.</p>
      ) : (
        <div className="overlay-list">
          {overlays.map((overlay) => (
            <div className="overlay-row" key={overlay.id}>
              <label className="overlay-visible">
                <input
                  type="checkbox"
                  checked={overlay.visible}
                  onChange={(event) =>
                    onUpdateOverlay(overlay.id, {
                      visible: event.target.checked,
                    })
                  }
                />
                <span title={overlay.name}>{overlay.name}</span>
              </label>
              <input
                type="color"
                value={overlay.color}
                aria-label={`${overlay.name} color`}
                onChange={(event) =>
                  onUpdateOverlay(overlay.id, {
                    color: event.target.value,
                  })
                }
              />
              <input
                className="width-input"
                type="number"
                min="1"
                max="12"
                step="0.5"
                value={overlay.width}
                aria-label={`${overlay.name} line width`}
                onChange={(event) =>
                  onUpdateOverlay(overlay.id, {
                    width: Number(event.target.value) || 3,
                  })
                }
              />
              <button
                className="icon-button small danger"
                type="button"
                title={`Remove ${overlay.name}`}
                aria-label={`Remove ${overlay.name}`}
                onClick={() => onRemoveOverlay(overlay.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
