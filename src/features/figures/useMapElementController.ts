import type { Dispatch, SetStateAction } from 'react'
import type { FigureSettings, MapElementKey } from '../../core/types'
import { useFigureElementController } from '../figure-elements/useFigureElementController'

export function useMapElementController<Settings extends FigureSettings>(
  settings: Settings,
  setSettings: Dispatch<SetStateAction<Settings>>,
  selectedElement: MapElementKey = 'title',
  keyboardEnabled = false,
) {
  return useFigureElementController({
    settings,
    setSettings,
    selectedElement,
    keyboardEnabled,
  })
}
