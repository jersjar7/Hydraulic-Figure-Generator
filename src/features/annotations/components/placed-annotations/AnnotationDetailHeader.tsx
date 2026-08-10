import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationEditorTypes'
import { annotationDisplayName } from '../../annotationEditorOperations'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationDetailHeader({ model, actions }: Props) {
  if (!model.selected) return null
  return (
    <div className="annotation-detail-header">
      <button
        className="icon-button compact"
        type="button"
        title="Back to placed annotations"
        aria-label="Back to placed annotations"
        onClick={actions.returnToList}
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </button>
      <div className="annotation-detail-title">
        <strong>
          {annotationDisplayName(model.selected, model.selectedIndex)}
        </strong>
        <small>
          {model.selectedIndex + 1} of {model.annotations.length}
        </small>
      </div>
      <div className="annotation-detail-paging">
        <button
          className="icon-button compact"
          type="button"
          title="Previous annotation"
          aria-label="Previous annotation"
          disabled={model.annotations.length < 2}
          onClick={() => actions.selectAdjacent(-1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button compact"
          type="button"
          title="Next annotation"
          aria-label="Next annotation"
          disabled={model.annotations.length < 2}
          onClick={() => actions.selectAdjacent(1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
