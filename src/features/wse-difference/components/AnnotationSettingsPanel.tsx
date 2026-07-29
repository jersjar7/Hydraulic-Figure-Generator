import { List, Plus } from 'lucide-react'
import { ControlSection } from '../../../components/ControlSection'
import type {
  AnnotationPanelActions,
  AnnotationPanelModel,
} from '../annotationPanelTypes'
import { AnnotationCreatePanel } from './AnnotationCreatePanel'
import { PlacedAnnotationsPanel } from './PlacedAnnotationsPanel'

type AnnotationSettingsPanelProps = {
  model: AnnotationPanelModel
  actions: AnnotationPanelActions
}

export function AnnotationSettingsPanel({
  model,
  actions,
}: AnnotationSettingsPanelProps) {
  return (
    <ControlSection>
      <div className="annotation-panel">
        <div
          className="annotation-view-tabs"
          role="tablist"
          aria-label="Annotation workspace"
        >
          <button
            className={`annotation-view-tab${model.panelView === 'create' ? ' active' : ''}`}
            type="button"
            id="annotation-view-tab-create"
            role="tab"
            aria-controls="annotation-view-panel-create"
            aria-selected={model.panelView === 'create'}
            tabIndex={model.panelView === 'create' ? 0 : -1}
            onClick={() => actions.choosePanelView('create')}
            onKeyDown={(event) =>
              actions.handlePanelTabKeyDown(event, 'create')
            }
          >
            <Plus size={15} aria-hidden="true" />
            <span>Create</span>
          </button>
          <button
            className={`annotation-view-tab${model.panelView === 'placed' ? ' active' : ''}`}
            type="button"
            id="annotation-view-tab-placed"
            role="tab"
            aria-controls="annotation-view-panel-placed"
            aria-selected={model.panelView === 'placed'}
            tabIndex={model.panelView === 'placed' ? 0 : -1}
            onClick={() => actions.choosePanelView('placed')}
            onKeyDown={(event) =>
              actions.handlePanelTabKeyDown(event, 'placed')
            }
          >
            <List size={15} aria-hidden="true" />
            <span>Placed</span>
            <span className="annotation-view-count">
              {model.annotations.length}
            </span>
          </button>
        </div>

        {model.panelView === 'create' ? (
          <AnnotationCreatePanel model={model} actions={actions} />
        ) : (
          <PlacedAnnotationsPanel model={model} actions={actions} />
        )}
      </div>
    </ControlSection>
  )
}
