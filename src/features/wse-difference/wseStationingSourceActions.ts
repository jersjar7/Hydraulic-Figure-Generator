import type { Dispatch, SetStateAction } from 'react'
import type { CenterlineDirection } from '../../core/types'
import type { useAssessmentWorkflow } from '../assessment-lines/useAssessmentWorkflow'
import type { useWseFigureElementController } from './useWseFigureElementController'

type Options = {
  assessmentWorkflow: ReturnType<typeof useAssessmentWorkflow>
  figureElements: ReturnType<typeof useWseFigureElementController>
  setSelectedLabelId: Dispatch<SetStateAction<string | null>>
}

export function createWseStationingSourceActions({
  assessmentWorkflow,
  figureElements,
  setSelectedLabelId,
}: Options) {
  const resetLabelOverrides = () => {
    figureElements.updateCenterlineStationing({ overrides: {} })
    setSelectedLabelId(null)
  }
  return {
    changeCenterline: (id: string) => {
      assessmentWorkflow.setCenterline(id)
      resetLabelOverrides()
    },
    changeDirection: (direction: CenterlineDirection) => {
      assessmentWorkflow.setDirection(direction)
      resetLabelOverrides()
    },
    changeStartStation: (station: number) => {
      assessmentWorkflow.setStartStation(station)
      resetLabelOverrides()
    },
  }
}
