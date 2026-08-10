import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BringToFront,
  RotateCcw,
  SendToBack,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationEditorTypes'
import { annotationCapabilities } from '../../annotationCapabilities'
import { AnnotationNudgeButton } from '../AnnotationNudgeButton'
import { AnnotationToggle } from '../AnnotationToggle'

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
      <AnnotationToggle
        label="Visible"
        checked={model.selected.visible !== false}
        onChange={actions.setSelectedVisible}
      />
      {capabilities.positionLock ? (
        <AnnotationToggle
          label="Lock position"
          checked={model.selected.locked ?? false}
          onChange={actions.setSelectedLocked}
        />
      ) : null}
      <div className="nudge-control">
        <span>Move selected</span>
        <div className="nudge-buttons">
          <AnnotationNudgeButton
            label="Move annotation left"
            icon={<ArrowLeft size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(-10, 0)}
          />
          <AnnotationNudgeButton
            label="Move annotation up"
            icon={<ArrowUp size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(0, -10)}
          />
          <AnnotationNudgeButton
            label="Move annotation down"
            icon={<ArrowDown size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(0, 10)}
          />
          <AnnotationNudgeButton
            label="Move annotation right"
            icon={<ArrowRight size={14} />}
            disabled={model.selected.locked}
            onClick={() => actions.nudgeSelected(10, 0)}
          />
        </div>
      </div>
      <div className="annotation-detail-actions">
        <button
          className="button secondary compact"
          type="button"
          disabled={model.selectedIndex <= 0}
          onClick={actions.sendSelectedBackward}
        >
          <SendToBack size={14} aria-hidden="true" />
          Send backward
        </button>
        <button
          className="button secondary compact"
          type="button"
          disabled={model.selectedIndex >= model.annotations.length - 1}
          onClick={actions.bringSelectedForward}
        >
          <BringToFront size={14} aria-hidden="true" />
          Bring forward
        </button>
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
