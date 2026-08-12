import type {
  FigureSettings,
  MapOverlay,
} from '../../core/types'
import { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { useAssessmentMapLayers } from './useAssessmentMapLayers'

type Options = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  settings: FigureSettings
  selectedStationLabelId: string | null
}

export function useWseAssessmentComposition({
  modelWkt,
  overlays,
  settings,
  selectedStationLabelId,
}: Options) {
  const workflow = useAssessmentWorkflow(1)
  const stationingSource = useCenterlineStationingSource()
  const layers = useAssessmentMapLayers({
    modelWkt,
    overlays,
    state: workflow.state,
    stationing: settings.centerlineStationing,
    stationingSource,
    selectedStationLabelId,
  })

  return {
    workflow,
    state: workflow.state,
    stationingSource,
    ...layers,
  }
}
