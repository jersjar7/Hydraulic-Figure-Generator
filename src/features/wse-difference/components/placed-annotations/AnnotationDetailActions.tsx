import { Copy, Trash2 } from 'lucide-react'
import type { AnnotationPanelActions } from '../../annotationPanelTypes'

export function AnnotationDetailActions({
  actions,
}: {
  actions: AnnotationPanelActions
}) {
  return (
    <div className="annotation-detail-actions">
      <button
        className="button secondary compact"
        type="button"
        onClick={actions.duplicateSelected}
      >
        <Copy size={15} aria-hidden="true" />
        Duplicate
      </button>
      <button
        className="button danger-outline compact"
        type="button"
        onClick={actions.deleteSelected}
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete
      </button>
    </div>
  )
}
