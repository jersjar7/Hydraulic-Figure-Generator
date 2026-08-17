import { FileImage, Images } from 'lucide-react'
import type { FigureDocumentOrientation } from '../../core/types'
import type { PlanViewFigureDocumentPage } from './planViewFigureDocument'

type Props = {
  title: string
  orientation: FigureDocumentOrientation
  pages: PlanViewFigureDocumentPage[]
  selectedPageId: string | null
  onSelect(id: string): void
}

export function PlanViewFigureDocumentPreview({
  title,
  orientation,
  pages,
  selectedPageId,
  onSelect,
}: Props) {
  if (pages.length === 0) {
    return (
      <div className="figure-set-empty">
        <div className="empty-symbol"><Images size={26} /></div>
        <h2>No document pages</h2>
        <p>Generate batch figures and include at least one figure.</p>
      </div>
    )
  }

  return (
    <section className="figure-document-preview" aria-label="Word document preview">
      <header className="figure-document-preview-header">
        <div>
          <h2>{title}</h2>
          <span>{pages.length} page{pages.length === 1 ? '' : 's'} · one figure per page</span>
        </div>
      </header>
      <div className="figure-document-pages">
        {pages.map((page) => (
          <button
            type="button"
            className={`figure-document-page ${orientation}${selectedPageId === page.id ? ' selected' : ''}`}
            key={page.id}
            onClick={() => onSelect(page.id)}
            aria-label={`Edit ${page.figureNumber}: ${page.caption}`}
          >
            <span className="figure-document-page-header">{title}</span>
            <span className="figure-document-page-image">
              {page.thumbnailUrl ? (
                <img src={page.thumbnailUrl} alt="" />
              ) : (
                <span className="figure-document-page-placeholder">
                  <FileImage size={28} aria-hidden="true" />
                  Preview not generated
                </span>
              )}
            </span>
            <span className="figure-document-page-caption">
              Figure {page.figureNumber}. {page.caption}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
