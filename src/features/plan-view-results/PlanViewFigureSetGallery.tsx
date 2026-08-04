import {
  AlertCircle,
  Check,
  Clock3,
  Image,
  LoaderCircle,
  RefreshCcw,
} from 'lucide-react'
import type { FigureSetItemRuntime } from '../../core/types'
import type { PlanViewFigureSetDocument, PlanViewFigureSetItem } from './planViewFigureSet'

type Props = {
  figureSet: PlanViewFigureSetDocument
  runtime: Record<string, FigureSetItemRuntime>
  draftCount: number
  onOpen(item: PlanViewFigureSetItem): void
  onToggleIncluded(id: string): void
}

function Status({ runtime }: { runtime?: FigureSetItemRuntime }) {
  const status = runtime?.status ?? 'queued'
  const Icon = status === 'ready'
    ? Check
    : status === 'error'
      ? AlertCircle
      : status === 'generating'
        ? LoaderCircle
        : status === 'stale'
          ? RefreshCcw
          : Clock3
  return (
    <span className={`figure-set-status ${status}`}>
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  )
}

export function PlanViewFigureSetGallery({
  figureSet,
  runtime,
  draftCount,
  onOpen,
  onToggleIncluded,
}: Props) {
  const included = figureSet.items.filter((item) => item.included).length
  const ready = figureSet.items.filter(
    (item) => runtime[item.id]?.status === 'ready',
  ).length

  if (figureSet.items.length === 0) {
    return (
      <div className="figure-set-empty">
        <div className="empty-symbol"><Image size={26} /></div>
        <h2>No figure previews</h2>
        <p>{draftCount} figure{draftCount === 1 ? '' : 's'} selected</p>
      </div>
    )
  }

  return (
    <section className="figure-set-gallery" aria-label="Figure set previews">
      <header className="figure-set-gallery-header">
        <div>
          <h2>{figureSet.name}</h2>
          <span>{ready} ready · {included} included · {figureSet.items.length} total</span>
        </div>
      </header>
      <div className="figure-set-grid">
        {figureSet.items.map((item, index) => {
          const itemRuntime = runtime[item.id]
          return (
            <article
              className={`figure-set-card${item.included ? '' : ' excluded'}`}
              key={item.id}
            >
              <button
                type="button"
                className="figure-set-preview"
                onClick={() => onOpen(item)}
                aria-label={`Open figure ${index + 1}: ${item.title}`}
              >
                {itemRuntime?.thumbnailUrl ? (
                  <img src={itemRuntime.thumbnailUrl} alt="" />
                ) : (
                  <span className="figure-set-preview-placeholder">
                    <Image size={25} aria-hidden="true" />
                  </span>
                )}
              </button>
              <div className="figure-set-card-body">
                <div className="figure-set-card-meta">
                  <span>Figure {index + 1}</span>
                  <Status runtime={itemRuntime} />
                </div>
                <strong title={item.title}>{item.title}</strong>
                {itemRuntime?.error ? (
                  <small className="figure-set-error">{itemRuntime.error}</small>
                ) : null}
                <label className="figure-set-include">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={() => onToggleIncluded(item.id)}
                  />
                  Include in document
                </label>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
