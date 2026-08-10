import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../annotationEditorTypes'
import { AnnotationContentEditor } from './placed-annotations/AnnotationContentEditor'
import { AnnotationDetailActions } from './placed-annotations/AnnotationDetailActions'
import { AnnotationDetailHeader } from './placed-annotations/AnnotationDetailHeader'
import { AnnotationEditorTabs } from './placed-annotations/AnnotationEditorTabs'
import { AnnotationPositionEditor } from './placed-annotations/AnnotationPositionEditor'
import { AnnotationStyleEditor } from './placed-annotations/AnnotationStyleEditor'
import { PlacedAnnotationList } from './placed-annotations/PlacedAnnotationList'

type PlacedAnnotationsPanelProps = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
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
        <PlacedAnnotationList model={model} actions={actions} />
      ) : model.selected ? (
        <div className="annotation-detail">
          <AnnotationDetailHeader model={model} actions={actions} />
          <AnnotationEditorTabs model={model} actions={actions} />
          <AnnotationContentEditor model={model} actions={actions} />
          <AnnotationStyleEditor model={model} actions={actions} />
          <AnnotationPositionEditor model={model} actions={actions} />
          <AnnotationDetailActions actions={actions} />
        </div>
      ) : null}
    </div>
  )
}
