import { useState, type Dispatch, type SetStateAction } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  MapOverlay,
  PlanViewResultSettings,
} from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import { useCenterlineStationingController } from '../stationing/useCenterlineStationingController'
import { useCenterlineStationingLayer } from '../stationing/useCenterlineStationingLayer'

type Options = {
  engine: HydraulicEngine
  scenarioId: string
  overlays: MapOverlay[]
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
  workflow: ReturnType<typeof useAssessmentWorkflow>
}

export function usePlanViewStationing({
  engine,
  scenarioId,
  overlays,
  settings,
  setSettings,
  workflow,
}: Options) {
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const state = workflow.state
  const stationing = useCenterlineStationingLayer({
    modelWkt: engine.condition(scenarioId)?.geometry?.wkt,
    overlays,
    settings: settings.centerlineStationing,
    centerlineId: state.centerlineId,
    direction: state.direction,
    startStation: state.startStation,
    selectedLabelId,
    setCenterline: workflow.setCenterline,
    setSelectedLabelId,
  })
  const controller = useCenterlineStationingController({
    bounds: engine.commonBounds([scenarioId]),
    settings,
    stationingLayer: stationing.layer,
    selectedLabelId,
    setSettings,
    setSelectedLabelId,
  })
  const resetLabelOverrides = () => {
    controller.update({ overrides: {} })
    setSelectedLabelId(null)
  }

  return {
    ...stationing,
    selectedLabelId,
    controller,
    source: stationing.selectedCenterline
      ? {
          centerline: stationing.selectedCenterline,
          direction: state.direction,
          startStation: state.startStation,
        }
      : undefined,
    changeCenterline: (id: string) => {
      workflow.setCenterline(id)
      resetLabelOverrides()
    },
    changeDirection: (direction: typeof state.direction) => {
      workflow.setDirection(direction)
      resetLabelOverrides()
    },
    changeStartStation: (station: number) => {
      workflow.setStartStation(station)
      resetLabelOverrides()
    },
    clearSelection: () => setSelectedLabelId(null),
    panelProps: {
      candidates: stationing.candidates,
      centerlineId: state.centerlineId,
      direction: state.direction,
      startStation: state.startStation,
      settings: settings.centerlineStationing,
      ticks: stationing.ticks,
      selectedLabelId,
      hasCenterline: Boolean(stationing.selectedCenterline),
      onCenterlineChange: (id: string) => {
        workflow.setCenterline(id)
        resetLabelOverrides()
      },
      onDirectionChange: (direction: typeof state.direction) => {
        workflow.setDirection(direction)
        resetLabelOverrides()
      },
      onStartStationChange: (station: number) => {
        workflow.setStartStation(station)
        resetLabelOverrides()
      },
      onChange: controller.update,
      onSelectLabel: setSelectedLabelId,
      onOverrideChange: controller.updateLabelOverride,
      onNudgeSelected: controller.nudgeSelectedLabel,
      onReset: controller.reset,
    },
  }
}
