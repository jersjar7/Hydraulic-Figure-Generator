import { ArrowDown, ArrowUp, LayoutGrid } from 'lucide-react'
import { ControlSection } from '../../components/ControlSection'
import type { usePlanViewFigureDocument } from './usePlanViewFigureDocument'

type Props = {
  controller: ReturnType<typeof usePlanViewFigureDocument>
  onManageFigures(): void
}

function finite(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function PlanViewFigureDocumentPanel({
  controller,
  onManageFigures,
}: Props) {
  const page = controller.selectedPage
  const pageIndex = page
    ? controller.pages.findIndex((candidate) => candidate.id === page.id)
    : -1

  return (
    <ControlSection>
      <label className="field">
        <span>Document title</span>
        <input
          value={controller.settings.title}
          onChange={(event) =>
            controller.updateSettings('title', event.currentTarget.value)
          }
        />
      </label>
      <div className="segmented" aria-label="Document orientation">
        {(['landscape', 'portrait'] as const).map((orientation) => (
          <button
            type="button"
            className={controller.settings.orientation === orientation ? 'active' : ''}
            key={orientation}
            onClick={() => controller.updateSettings('orientation', orientation)}
          >
            {orientation[0].toUpperCase() + orientation.slice(1)}
          </button>
        ))}
      </div>
      <div className="figure-document-field-grid">
        <label className="field">
          <span>Page margin (in)</span>
          <input
            type="number"
            min="0.25"
            max="2"
            step="0.05"
            value={controller.settings.marginInches}
            onChange={(event) => controller.updateSettings(
              'marginInches',
              finite(event.currentTarget.value, 0.5),
            )}
          />
        </label>
        <label className="field">
          <span>Start number</span>
          <input
            type="number"
            min="1"
            step="1"
            value={controller.settings.startingFigureNumber}
            onChange={(event) => controller.updateSettings(
              'startingFigureNumber',
              Math.max(1, Math.round(finite(event.currentTarget.value, 1))),
            )}
          />
        </label>
      </div>
      <label className="field">
        <span>Caption prefix</span>
        <input
          value={controller.settings.captionPrefix}
          onChange={(event) =>
            controller.updateSettings('captionPrefix', event.currentTarget.value)
          }
        />
      </label>

      <div className="figure-document-summary">
        <strong>{controller.pages.length} document pages</strong>
        <button className="button compact" type="button" onClick={onManageFigures}>
          <LayoutGrid size={14} aria-hidden="true" /> Manage figures
        </button>
      </div>

      {page ? (
        <div className="figure-document-selected">
          <div className="compact-section-heading">
            <span>Page {pageIndex + 1}</span>
            <span>{controller.settings.captionPrefix} {page.figureNumber}</span>
          </div>
          <strong title={page.title}>{page.title}</strong>
          <label className="field">
            <span>Caption</span>
            <textarea
              rows={4}
              value={page.caption}
              onChange={(event) =>
                controller.updateCaption(page.id, event.currentTarget.value)
              }
            />
          </label>
          <div className="figure-document-page-actions">
            <button
              className="button compact"
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => controller.moveItem(page.id, -1)}
            >
              <ArrowUp size={14} aria-hidden="true" /> Move up
            </button>
            <button
              className="button compact"
              type="button"
              disabled={pageIndex < 0 || pageIndex >= controller.pages.length - 1}
              onClick={() => controller.moveItem(page.id, 1)}
            >
              <ArrowDown size={14} aria-hidden="true" /> Move down
            </button>
          </div>
        </div>
      ) : null}
    </ControlSection>
  )
}
