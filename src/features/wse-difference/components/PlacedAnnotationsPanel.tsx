import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  MapPin,
  Palette,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import type { ResultLabelField } from '../../../core/types'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../annotationPanelTypes'
import {
  annotationDisplayName,
  annotationHasContentEditor,
} from '../workspaceInteractions'
import { NudgeButton } from './NudgeButton'
import { Toggle } from './Toggle'

type PlacedAnnotationsPanelProps = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

const numeric = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function PlacedAnnotationsPanel({
  model,
  actions,
}: PlacedAnnotationsPanelProps) {
  return (
    <div
      className={`annotation-view-panel annotation-manager ${model.placedView}-view`}
      id="annotation-view-panel-placed"
      role="tabpanel"
      aria-labelledby="annotation-view-tab-placed"
    >
      {model.placedView === 'list' ? (
        model.annotations.length === 0 ? (
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
        ) : (
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
                  <small>
                    {annotation.text.split(/\r?\n/)[0] || 'Untitled'}
                  </small>
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
      ) : model.selected ? (
        <div className="annotation-detail">
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
                {annotationDisplayName(
                  model.selected,
                  model.selectedIndex,
                )}
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

          <div
            className="annotation-editor-tabs"
            role="tablist"
            aria-label="Annotation editor sections"
          >
            {annotationHasContentEditor(model.selected) ? (
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

          {model.editorView === 'content' ? (
            <div
              className="annotation-editor-panel"
              id="annotation-editor-panel-content"
              role="tabpanel"
              aria-labelledby="annotation-editor-tab-content"
            >
              {model.selected.kind === 'result' &&
              !model.selected.hydraulicExtremum ? (
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
                      actions.updateAppearance({
                        text: event.target.value,
                      })
                    }
                  />
                </label>
              )}
            </div>
          ) : null}

          {model.editorView === 'style' ? (
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
                      actions.updateAppearance({
                        color: event.target.value,
                      })
                    }
                  />
                </label>
                {annotationHasContentEditor(model.selected) ? (
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
                {annotationHasContentEditor(model.selected) ? (
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
              {annotationHasContentEditor(model.selected) ? (
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
              {annotationHasContentEditor(model.selected) ? (
                <Toggle
                  label="Text background"
                  checked={model.editor.background}
                  onChange={(checked) =>
                    actions.updateAppearance({ background: checked })
                  }
                />
              ) : null}
            </div>
          ) : null}

          {model.editorView === 'position' ? (
            <div
              className="annotation-editor-panel"
              id="annotation-editor-panel-position"
              role="tabpanel"
              aria-labelledby="annotation-editor-tab-position"
            >
              <div className="nudge-control">
                <span>Move selected</span>
                <div className="nudge-buttons">
                  <NudgeButton
                    label="Move annotation left"
                    icon={<ArrowLeft size={14} />}
                    onClick={() => actions.nudgeSelected(-10, 0)}
                  />
                  <NudgeButton
                    label="Move annotation up"
                    icon={<ArrowUp size={14} />}
                    onClick={() => actions.nudgeSelected(0, -10)}
                  />
                  <NudgeButton
                    label="Move annotation down"
                    icon={<ArrowDown size={14} />}
                    onClick={() => actions.nudgeSelected(0, 10)}
                  />
                  <NudgeButton
                    label="Move annotation right"
                    icon={<ArrowRight size={14} />}
                    onClick={() => actions.nudgeSelected(10, 0)}
                  />
                </div>
              </div>
            </div>
          ) : null}

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
        </div>
      ) : null}
    </div>
  )
}
