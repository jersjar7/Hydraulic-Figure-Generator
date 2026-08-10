import {
  MapPin,
  Palette,
  Type,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationEditorTypes'
import { annotationCapabilities } from '../../annotationCapabilities'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationEditorTabs({ model, actions }: Props) {
  if (!model.selected) return null
  const capabilities = annotationCapabilities(model.selected)
  return (
    <div
      className="annotation-editor-tabs"
      role="tablist"
      aria-label="Annotation editor sections"
    >
      {capabilities.content ? (
        <button
          className={`annotation-editor-tab${model.editorView === 'content' ? ' active' : ''}`}
          type="button"
          id="annotation-editor-tab-content"
          role="tab"
          aria-controls="annotation-editor-panel-content"
          aria-selected={model.editorView === 'content'}
          tabIndex={model.editorView === 'content' ? 0 : -1}
          onClick={() => actions.setEditorView('content')}
          onKeyDown={(event) =>
            actions.handleEditorTabKeyDown(event, 'content')
          }
        >
          <Type size={14} aria-hidden="true" />
          Content
        </button>
      ) : null}
      <button
        className={`annotation-editor-tab${model.editorView === 'style' ? ' active' : ''}`}
        type="button"
        id="annotation-editor-tab-style"
        role="tab"
        aria-controls="annotation-editor-panel-style"
        aria-selected={model.editorView === 'style'}
        tabIndex={model.editorView === 'style' ? 0 : -1}
        onClick={() => actions.setEditorView('style')}
        onKeyDown={(event) =>
          actions.handleEditorTabKeyDown(event, 'style')
        }
      >
        <Palette size={14} aria-hidden="true" />
        Style
      </button>
      <button
        className={`annotation-editor-tab${model.editorView === 'position' ? ' active' : ''}`}
        type="button"
        id="annotation-editor-tab-position"
        role="tab"
        aria-controls="annotation-editor-panel-position"
        aria-selected={model.editorView === 'position'}
        tabIndex={model.editorView === 'position' ? 0 : -1}
        onClick={() => actions.setEditorView('position')}
        onKeyDown={(event) =>
          actions.handleEditorTabKeyDown(event, 'position')
        }
      >
        <MapPin size={14} aria-hidden="true" />
        Position
      </button>
    </div>
  )
}
