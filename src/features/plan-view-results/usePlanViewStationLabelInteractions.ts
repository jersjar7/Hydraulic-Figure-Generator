import { useState } from 'react'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'
import { useStationLabelCanvasInteractions } from '../stationing/useStationLabelCanvasInteractions'

type Options = {
  enabled: boolean
  bounds: Bounds
  settings: FigureSettings
  layers: CenterlineStationLayer[]
  setActiveCenterline(id: string): void
  selectLabel(id: string | null): void
  updateOverride(id: string, override: StationLabelOverride | null): void
  openStationingPanel(): void
}

export function usePlanViewStationLabelInteractions({
  enabled,
  bounds,
  settings,
  layers,
  setActiveCenterline,
  selectLabel,
  updateOverride,
  openStationingPanel,
}: Options) {
  const [dragging, setDragging] = useState(false)
  const interactions = useStationLabelCanvasInteractions({
    enabled,
    bounds,
    settings,
    layers,
    selectLabel: (id, centerlineId) => {
      setActiveCenterline(centerlineId)
      selectLabel(id)
      openStationingPanel()
    },
    updateOverride,
    setDragging,
  })

  return { ...interactions, dragging }
}
