import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationPanelTypes'
import { annotationCapabilities } from '../../../annotations/annotationCapabilities'
import { NudgeButton } from '../NudgeButton'
import { Toggle } from '../Toggle'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationPositionEditor({ model, actions }: Props) {
  if (!model.selected || model.editorView !== 'position') return null
  const capabilities = annotationCapabilities(model.selected)
  const canReset = Boolean(
    model.selected.defaultPoints || model.selected.hydraulicExtremum,
  )
  return (
    <div
      className="annotation-editor-panel"
      id="annotation-editor-panel-position"
      role="tabpanel"
      aria-labelledby="annotation-editor-tab-position"
    >
      {capabilities.positionLock ? (
        <Toggle
          label="Lock position"
          checked={model.selected.locked ?? false}
          onChange={actions.setSelectedLocked}
        />
      ) : null}
      <div className="nudge-control">
        <span>Move selected</span>
        <div className="nudge-buttons">
          <NudgeButton
            label="Move annotation left"
            icon={<ArrowLeft size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(-10, 0)}
          />
          <NudgeButton
            label="Move annotation up"
            icon={<ArrowUp size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(0, -10)}
          />
          <NudgeButton
            label="Move annotation down"
            icon={<ArrowDown size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(0, 10)}
          />
          <NudgeButton
            label="Move annotation right"
            icon={<ArrowRight size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(10, 0)}
          />
        </div>
      </div>
      {canReset ? (
        <button
          className="button secondary compact full"
          type="button"
          disabled={model.selected.locked}
          onClick={actions.resetSelectedPosition}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset position
        </button>
      ) : null}
    </div>
  )
}
