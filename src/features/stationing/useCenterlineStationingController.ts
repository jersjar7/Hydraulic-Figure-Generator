import type { Dispatch, SetStateAction } from 'react'
import { createDefaultFigureSettings } from '../../core/defaults'
import {
  canvasPointToMap,
  mapPointToCanvas,
  stationLabelPosition,
} from '../../core/mapRenderer'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'

type Options<Settings extends FigureSettings> = {
  bounds: Bounds
  settings: Settings
  stationingLayer: CenterlineStationLayer | null | undefined
  selectedLabelId: string | null
  setSettings: Dispatch<SetStateAction<Settings>>
  setSelectedLabelId: Dispatch<SetStateAction<string | null>>
}

export function useCenterlineStationingController<Settings extends FigureSettings>({
  bounds,
  settings,
  stationingLayer,
  selectedLabelId,
  setSettings,
  setSelectedLabelId,
}: Options<Settings>) {
  const update = (
    patch: Partial<FigureSettings['centerlineStationing']>,
  ) => {
    setSettings((current) => ({
      ...current,
      centerlineStationing: {
        ...current.centerlineStationing,
        ...patch,
      },
    }))
  }

  const updateLabelOverride = (
    id: string,
    override: StationLabelOverride | null,
  ) => {
    setSettings((current) => {
      const overrides = { ...current.centerlineStationing.overrides }
      if (override) overrides[id] = override
      else delete overrides[id]
      return {
        ...current,
        centerlineStationing: {
          ...current.centerlineStationing,
          overrides,
        },
      }
    })
  }

  const nudgeSelectedLabel = (dx: number, dy: number) => {
    if (!selectedLabelId || !stationingLayer) return
    const currentPoint = stationLabelPosition(
      stationingLayer,
      bounds,
      settings,
      selectedLabelId,
    )
    if (!currentPoint) return
    const screenPoint = mapPointToCanvas(currentPoint, bounds, settings)
    const nextPoint = canvasPointToMap(
      screenPoint.x + dx,
      screenPoint.y + dy,
      bounds,
      settings,
    )
    updateLabelOverride(selectedLabelId, {
      ...settings.centerlineStationing.overrides[selectedLabelId],
      labelPoint: nextPoint,
    })
  }

  const reset = () => {
    const defaults = createDefaultFigureSettings().centerlineStationing
    setSettings((current) => ({
      ...current,
      centerlineStationing: structuredClone(defaults),
    }))
    setSelectedLabelId(null)
  }

  return {
    update,
    updateLabelOverride,
    nudgeSelectedLabel,
    reset,
  }
}
