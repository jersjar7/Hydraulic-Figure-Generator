import { Layers3 } from 'lucide-react'
import { LayersWorkspace } from '../LayersWorkspace'
import type { ProjectWorkflowModule } from '../projectWorkflowModule'
import type { ProjectWorkflowContext } from '../projectWorkflowTypes'

export const layersWorkflowModule: ProjectWorkflowModule<ProjectWorkflowContext> =
  {
    key: 'layers',
    label: 'Layers',
    title: 'Shapefile overlays',
    icon: Layers3,
    status: ({ overlays }) => ({
      badge: overlays.length || undefined,
      tone: overlays.length > 0 ? 'ready' : 'neutral',
    }),
    render: (context) => (
      <LayersWorkspace
        busy={context.busy}
        overlays={context.overlays}
        showOverlays={context.showOverlays}
        onOverlayFiles={context.onOverlayFiles}
        onShowOverlaysChange={context.onShowOverlaysChange}
        onUpdateOverlay={context.onUpdateOverlay}
        onRemoveOverlay={context.onRemoveOverlay}
      />
    ),
  }
