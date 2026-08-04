import { useState, type Dispatch, type SetStateAction } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  MapOverlay,
  PlanViewResultSettings,
} from '../../core/types'
import { useCenterlineStationingController } from '../stationing/useCenterlineStationingController'
import { useCenterlineStationingLayer } from '../stationing/useCenterlineStationingLayer'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'

type Options = {
  engine: HydraulicEngine
  scenarioId: string
  overlays: MapOverlay[]
  settings: PlanViewResultSettings
  setSettings: Dispatch<SetStateAction<PlanViewResultSettings>>
  sourceController: ReturnType<typeof useCenterlineStationingSource>
}

export function usePlanViewStationing({
  engine,
  scenarioId,
  overlays,
  settings,
  setSettings,
  sourceController,
}: Options) {
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const state = sourceController.state
  const stationing = useCenterlineStationingLayer({
    modelWkt: engine.condition(scenarioId)?.geometry?.wkt,
    overlays,
    settings: settings.centerlineStationing,
    centerlineId: state.centerlineId,
    direction: state.direction,
    startStation: state.startStation,
    selectedLabelId,
    setCenterline: sourceController.setCenterline,
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
      sourceController.setCenterline(id)
      resetLabelOverrides()
    },
    changeDirection: (direction: typeof state.direction) => {
      sourceController.setDirection(direction)
      resetLabelOverrides()
    },
    changeStartStation: (station: number) => {
      sourceController.setStartStation(station)
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
        sourceController.setCenterline(id)
        resetLabelOverrides()
      },
      onDirectionChange: (direction: typeof state.direction) => {
        sourceController.setDirection(direction)
        resetLabelOverrides()
      },
      onStartStationChange: (station: number) => {
        sourceController.setStartStation(station)
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
