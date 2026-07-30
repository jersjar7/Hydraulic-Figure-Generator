import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../../annotationPanelTypes'
import { NudgeButton } from '../NudgeButton'

type Props = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationPositionEditor({ model, actions }: Props) {
  if (!model.selected || model.editorView !== 'position') return null
  return (
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
  )
}
