import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineStationLayer,
  MapAnnotation,
  MapOverlay,
  PlanViewResultScene,
  PlanViewResultSettings,
} from '../../core/types'
import type { PlanViewResultRenderDocument } from '../../core/map/planViewResultRenderer'

type RenderMode = 'editor' | 'published'

type Options = {
  engine: HydraulicEngine
  scene: PlanViewResultScene
  settings: PlanViewResultSettings
  overlays: MapOverlay[]
  centerlineStationing?: CenterlineStationLayer[]
  annotations?: MapAnnotation[]
  selectedAnnotationId?: string | null
  mode?: RenderMode
}

export function createPlanViewResultRenderDocument({
  engine,
  scene,
  settings,
  overlays,
  centerlineStationing,
  annotations = [],
  selectedAnnotationId = null,
  mode = 'editor',
}: Options): PlanViewResultRenderDocument {
  return {
    scene,
    view: {
      bounds: engine.commonBounds([scene.condition.key]),
      settings,
    },
    layers: {
      overlays,
      centerlineStationing: (centerlineStationing ?? []).map((layer) => ({
        ...layer,
        selectedLabelId:
          mode === 'published'
            ? null
            : layer.selectedLabelId,
      })),
      annotations,
    },
    selection: {
      selectedAnnotationId: mode === 'published' ? null : selectedAnnotationId,
    },
  }
}
