import type { Dispatch, SetStateAction } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineStationLayer,
  FigureElementPanelKey,
  FigureSettings,
} from '../../core/types'
import { useFigureElementController } from '../figure-elements/useFigureElementController'
import { useCenterlineStationingController } from '../stationing/useCenterlineStationingController'

type FigureElementControllerOptions = {
  engine: HydraulicEngine
  settings: FigureSettings
  stationingLayer: CenterlineStationLayer | null | undefined
  selectedStationLabelId: string | null
  selectedElement: FigureElementPanelKey
  keyboardEnabled: boolean
  setSettings: Dispatch<SetStateAction<FigureSettings>>
  setSelectedStationLabelId: Dispatch<SetStateAction<string | null>>
}

export function useWseFigureElementController({
  engine,
  settings,
  stationingLayer,
  selectedStationLabelId,
  selectedElement,
  keyboardEnabled,
  setSettings,
  setSelectedStationLabelId,
}: FigureElementControllerOptions) {
  const stationing = useCenterlineStationingController({
    bounds: engine.commonBounds(),
    settings,
    stationingLayer,
    selectedLabelId: selectedStationLabelId,
    setSettings,
    setSelectedLabelId: setSelectedStationLabelId,
  })
  const elements = useFigureElementController({
    settings,
    setSettings,
    selectedElement,
    keyboardEnabled,
  })

  return {
    updateCenterlineStationing: stationing.update,
    updateStationLabelOverride: stationing.updateLabelOverride,
    ...elements,
    nudgeStationLabel: stationing.nudgeSelectedLabel,
    resetStationLabelPosition: stationing.resetSelectedLabelPosition,
    resetCenterlineStationing: stationing.reset,
  }
}
