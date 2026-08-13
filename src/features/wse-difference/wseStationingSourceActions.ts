import type { Dispatch, SetStateAction } from 'react'
import type { CenterlineDirection } from '../../core/types'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import type { useWseFigureElementController } from './useWseFigureElementController'

type Options = {
  sourceController: ReturnType<typeof useCenterlineStationingSource>
  figureElements: ReturnType<typeof useWseFigureElementController>
  setSelectedLabelId: Dispatch<SetStateAction<string | null>>
}

export function createWseStationingSourceActions({
  sourceController,
  figureElements,
  setSelectedLabelId,
}: Options) {
  const resetLabelOverrides = () => {
    figureElements.updateCenterlineStationing({ overrides: {} })
    setSelectedLabelId(null)
  }
  return {
    selectCenterline: (id: string) => {
      sourceController.toggleCenterline(id, true)
      resetLabelOverrides()
    },
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
  }
}
