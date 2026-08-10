import { useState, type Dispatch, type SetStateAction } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineDirection,
  MapOverlay,
  PlanViewResultSettings,
} from '../../core/types'
import { useCenterlineStationingController } from '../stationing/useCenterlineStationingController'
import { useCenterlineStationingLayers } from '../stationing/useCenterlineStationingLayers'
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
  const stationing = useCenterlineStationingLayers({
    modelWkt: engine.condition(scenarioId)?.geometry?.wkt,
    overlays,
    settings: settings.centerlineStationing,
    source: state,
    selectedLabelId,
    toggleCenterline: sourceController.toggleCenterline,
    setSelectedLabelId,
  })
  const controller = useCenterlineStationingController({
    bounds: engine.commonBounds([scenarioId]),
    settings,
    stationingLayer: stationing.activeLayer,
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
    source: stationing.source.centerlines.length > 0
      ? stationing.source
      : undefined,
    changeActiveCenterline: (id: string) => {
      sourceController.setActiveCenterline(id)
      setSelectedLabelId(null)
    },
    toggleCenterline: (id: string, selected: boolean) => {
      sourceController.toggleCenterline(id, selected)
      resetLabelOverrides()
    },
    changeDirection: (direction: CenterlineDirection) => {
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
      centerlineId: state.activeCenterlineId,
      selectedCenterlineIds: state.centerlines.map((entry) => entry.centerlineId),
      direction: stationing.activeEntry?.direction ?? 'a-to-b',
      startStation: stationing.activeEntry?.startStation ?? 0,
      settings: settings.centerlineStationing,
      ticks: stationing.activeLayer?.ticks ?? [],
      selectedLabelId,
      hasCenterline: stationing.layers.length > 0,
      onCenterlineChange: (id: string) => {
        sourceController.setActiveCenterline(id)
        setSelectedLabelId(null)
      },
      onCenterlineToggle: (id: string, selected: boolean) => {
        sourceController.toggleCenterline(id, selected)
        resetLabelOverrides()
      },
      onDirectionChange: (direction: 'a-to-b' | 'b-to-a') => {
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
      onResetSelectedPosition: controller.resetSelectedLabelPosition,
      onReset: controller.reset,
    },
  }
}
