import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Crosshair,
  X,
} from 'lucide-react'
import type { ResultLabelField } from '../../../core/types'
import {
  ANNOTATION_TOOLS,
} from '../workspaceConfiguration'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../annotationPanelTypes'
import { Toggle } from './Toggle'

type AnnotationCreatePanelProps = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

const numeric = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function AnnotationCreatePanel({
  model,
  actions,
}: AnnotationCreatePanelProps) {
  return (
    <div
      className="annotation-view-panel"
      id="annotation-view-panel-create"
      role="tabpanel"
      aria-labelledby="annotation-view-tab-create"
    >
      <div
        className="annotation-tools"
        role="toolbar"
        aria-label="Annotation tools"
      >
        {ANNOTATION_TOOLS.map((tool) => {
          const ToolIcon = tool.icon
          return (
            <button
              className={`annotation-tool${model.tool === tool.key ? ' active' : ''}`}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={model.tool === tool.key}
              disabled={!model.sceneReady}
              key={tool.key}
              onClick={() => actions.chooseTool(tool.key)}
            >
              <ToolIcon size={16} aria-hidden="true" />
              <span>{tool.label}</span>
            </button>
          )
        })}
      </div>

      {model.drawing ? (
        <button
          className="button secondary compact full"
          type="button"
          onClick={actions.cancelDrawing}
        >
          <X size={15} aria-hidden="true" />
          Cancel current drawing
        </button>
      ) : null}

      {model.tool === 'extrema' ? (
        <div className="extrema-callout-card">
          <div className="extrema-callout-heading">
            <ArrowUpDown size={16} aria-hidden="true" />
            <strong>Maximum WSE change</strong>
          </div>
          <div className="extrema-values">
            <div className="extrema-value rise">
              <ArrowUp size={14} aria-hidden="true" />
              <span>Maximum rise</span>
              <strong>
                {model.extrema?.rise
                  ? `+${model.extrema.rise.value.toFixed(2)} ft`
                  : 'None'}
              </strong>
            </div>
            <div className="extrema-value reduction">
              <ArrowDown size={14} aria-hidden="true" />
              <span>Maximum reduction</span>
              <strong>
                {model.extrema?.reduction
                  ? `${model.extrema.reduction.value.toFixed(2)} ft`
                  : 'None'}
              </strong>
            </div>
          </div>
          <button
            className="button secondary compact full"
            type="button"
            title={`Place labels at the maximum positive and negative ${model.comparisonLabel}-minus-${model.baselineLabel} WSE values`}
            disabled={
              !model.sceneReady ||
              (!model.extrema?.rise && !model.extrema?.reduction)
            }
            onClick={actions.addExtremaCallouts}
          >
            <Crosshair size={14} aria-hidden="true" />
            {model.extremaCalloutCount > 0
              ? 'Refresh max / min WSE callouts'
              : 'Add max / min WSE callouts'}
          </button>
        </div>
      ) : null}

      {model.tool === 'text' || model.tool === 'leader' ? (
        <label className="field">
          <span>New annotation text</span>
          <textarea
            className="annotation-textarea"
            rows={3}
            value={model.editor.text}
            onChange={(event) =>
              actions.updateAppearance({ text: event.target.value })
            }
          />
        </label>
      ) : null}

      {model.tool === 'result' ? (
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
      ) : null}

      {model.tool !== 'select' ? (
        <>
          <div className="annotation-style-heading">
            <span>New item style</span>
          </div>
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
          </div>
          {model.tool !== 'line' && model.tool !== 'arrow' ? (
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
                        Math.min(
                          180,
                          numeric(event.target.value, 0),
                        ),
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
          {model.tool !== 'line' && model.tool !== 'arrow' ? (
            <Toggle
              label="Text background"
              checked={model.editor.background}
              onChange={(checked) =>
                actions.updateAppearance({ background: checked })
              }
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
