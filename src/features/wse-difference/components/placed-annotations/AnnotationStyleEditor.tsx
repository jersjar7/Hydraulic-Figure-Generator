import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationPanelTypes'
import { annotationCapabilities } from '../../../annotations/annotationCapabilities'
import { Toggle } from '../Toggle'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

const numeric = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function AnnotationStyleEditor({ model, actions }: Props) {
  if (!model.selected || model.editorView !== 'style') return null
  const capabilities = annotationCapabilities(model.selected)
  return (
    <div
      className="annotation-editor-panel"
      id="annotation-editor-panel-style"
      role="tabpanel"
      aria-labelledby="annotation-editor-tab-style"
    >
      <div className="field-grid two">
        <label className="field color-field">
          <span>Color</span>
          <input
            type="color"
            value={model.editor.color}
            onChange={(event) =>
              actions.updateAppearance({ color: event.target.value })
            }
          />
        </label>
        {capabilities.fill ? (
          <label className="field color-field">
            <span>Box fill</span>
            <input
              type="color"
              value={model.editor.fillColor}
              onChange={(event) =>
                actions.updateAppearance({
                  fillColor: event.target.value,
                })
              }
            />
          </label>
        ) : null}
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Line width <small>px</small>
          </span>
          <input
            type="number"
            min="1"
            max="12"
            step="0.5"
            value={model.editor.lineWidth}
            onChange={(event) =>
              actions.updateAppearance({
                lineWidth: numeric(event.target.value, 3),
              })
            }
          />
        </label>
        {capabilities.typography ? (
          <label className="field">
            <span>
              Text size <small>px</small>
            </span>
            <input
              type="number"
              min="10"
              max="48"
              step="1"
              value={model.editor.fontSize}
              onChange={(event) =>
                actions.updateAppearance({
                  fontSize: numeric(event.target.value, 20),
                })
              }
            />
          </label>
        ) : null}
      </div>
      {capabilities.typography ? (
        <label className="field">
          <span>
            Text rotation <small>degrees</small>
          </span>
          <div className="annotation-rotation-control">
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              aria-label="Text rotation slider"
              value={model.editor.rotation ?? 0}
              onChange={(event) =>
                actions.updateAppearance({
                  rotation: numeric(event.target.value, 0),
                })
              }
            />
            <input
              type="number"
              min="-180"
              max="180"
              step="1"
              aria-label="Text rotation degrees"
              value={model.editor.rotation ?? 0}
              onChange={(event) =>
                actions.updateAppearance({
                  rotation: Math.max(
                    -180,
                    Math.min(180, numeric(event.target.value, 0)),
                  ),
                })
              }
            />
          </div>
        </label>
      ) : null}
      <Toggle
        label="Dashed line"
        checked={model.editor.dashed}
        onChange={(checked) =>
          actions.updateAppearance({ dashed: checked })
        }
      />
      {capabilities.typography ? (
        <Toggle
          label="Text background"
          checked={model.editor.background}
          onChange={(checked) =>
            actions.updateAppearance({ background: checked })
          }
        />
      ) : null}
    </div>
  )
}
