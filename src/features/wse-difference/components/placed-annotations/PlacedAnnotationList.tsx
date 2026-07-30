import {
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationPanelTypes'
import { annotationDisplayName } from '../../workspaceInteractions'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function PlacedAnnotationList({ model, actions }: Props) {
  if (model.annotations.length === 0) {
    return (
      <div className="annotation-manager-empty">
        <p>No annotations placed yet.</p>
        <button
          className="button secondary compact"
          type="button"
          onClick={() => actions.choosePanelView('create')}
        >
          <Plus size={14} aria-hidden="true" />
          Create annotation
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="annotation-list"
        role="listbox"
        aria-label="Placed annotations"
      >
        {model.annotations.map((annotation, index) => (
          <button
            className={`annotation-list-item${annotation.id === model.selectedId ? ' active' : ''}`}
            type="button"
            role="option"
            aria-selected={annotation.id === model.selectedId}
            tabIndex={
              annotation.id === model.selectedId ||
              (!model.selectedId && index === 0)
                ? 0
                : -1
            }
            ref={(node) => {
              if (node) {
                model.listItemRefs.current?.set(annotation.id, node)
              } else {
                model.listItemRefs.current?.delete(annotation.id)
              }
            }}
            key={annotation.id}
            onClick={() => actions.selectPlaced(annotation)}
            onKeyDown={(event) =>
              actions.handleListKeyDown(event, index)
            }
          >
            <span>{annotationDisplayName(annotation, index)}</span>
            <small>{annotation.text.split(/\r?\n/)[0] || 'Untitled'}</small>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
      <button
        className="text-button annotation-clear"
        type="button"
        onClick={actions.clearAnnotations}
      >
        <Trash2 size={14} aria-hidden="true" />
        Clear all annotations
      </button>
    </>
  )
}
