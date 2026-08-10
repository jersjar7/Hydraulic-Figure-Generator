import type { Dispatch, SetStateAction } from 'react'
import { createDefaultFigureSettings } from '../../core/defaults'
import { stationLabelFramePosition } from '../../core/mapRenderer'
import { stationLabelOverride } from '../../core/map/stationLabelLayout'
import type {
  Bounds,
  CenterlineStationLayer,
  FigureSettings,
  StationLabelOverride,
} from '../../core/types'
import {
  moveStationLabelOverrideInFrame,
  resetStationLabelPosition,
} from './stationLabelFigureObject'

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
      const tick = stationingLayer?.ticks.find((item) => item.id === id)
      if (tick?.legacyId && tick.legacyId !== id) {
        delete overrides[tick.legacyId]
      }
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
    const geometry = stationLabelFramePosition(
      stationingLayer,
      bounds,
      settings,
      selectedLabelId,
    )
    const tick = stationingLayer.ticks.find(
      (item) => item.id === selectedLabelId,
    )
    if (!geometry || !tick) return
    updateLabelOverride(
      selectedLabelId,
      moveStationLabelOverrideInFrame({
        id: selectedLabelId,
        geometry,
        override: stationLabelOverride(stationingLayer, settings, tick),
        delta: { x: dx, y: dy },
        settings,
      }),
    )
  }

  const resetSelectedLabelPosition = () => {
    if (!selectedLabelId || !stationingLayer) return
    const tick = stationingLayer.ticks.find(
      (item) => item.id === selectedLabelId,
    )
    if (!tick) return
    updateLabelOverride(
      selectedLabelId,
      resetStationLabelPosition(
        stationLabelOverride(stationingLayer, settings, tick),
      ),
    )
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
    resetSelectedLabelPosition,
    reset,
  }
}
