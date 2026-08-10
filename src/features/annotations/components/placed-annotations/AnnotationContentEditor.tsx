import type { ResultLabelField } from '../../../../core/types'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationEditorTypes'
import { annotationCapabilities } from '../../annotationCapabilities'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationContentEditor({ model, actions }: Props) {
  if (!model.selected || model.editorView !== 'content') return null
  const capabilities = annotationCapabilities(model.selected)
  return (
    <div
      className="annotation-editor-panel"
      id="annotation-editor-panel-content"
      role="tabpanel"
      aria-labelledby="annotation-editor-tab-content"
    >
      {capabilities.resultField ? (
        <label className="field">
          <span>Automatic result label</span>
          <select
            value={model.activeResultField}
            onChange={(event) =>
              actions.setResultField(
                event.target.value as ResultLabelField,
              )
            }
          >
            {model.resultLabelOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          <span>Text</span>
          <textarea
            className="annotation-textarea"
            rows={4}
            value={model.editor.text}
            onChange={(event) =>
              actions.updateAppearance({ text: event.target.value })
            }
          />
        </label>
      )}
    </div>
  )
}
