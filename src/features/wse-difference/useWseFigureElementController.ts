import type { Dispatch, SetStateAction } from 'react'
import { createDefaultFigureSettings } from '../../core/defaults'
import {
  DEFAULT_ELEMENT_STYLES,
} from '../../core/figureElements'
import {
  canvasPointToMap,
  DEFAULT_ELEMENT_POSITIONS,
  mapPointToCanvas,
  stationLabelPosition,
} from '../../core/mapRenderer'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineStationLayer,
  FigureSettings,
  MapElementKey,
  MapElementStyles,
  StationLabelOverride,
} from '../../core/types'

type FigureElementControllerOptions = {
  engine: HydraulicEngine
  settings: FigureSettings
  stationingLayer: CenterlineStationLayer | null | undefined
  selectedStationLabelId: string | null
  setSettings: Dispatch<SetStateAction<FigureSettings>>
  setSelectedStationLabelId: Dispatch<SetStateAction<string | null>>
}

export function useWseFigureElementController({
  engine,
  settings,
  stationingLayer,
  selectedStationLabelId,
  setSettings,
  setSelectedStationLabelId,
}: FigureElementControllerOptions) {
  const updateCenterlineStationing = (
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

  const updateStationLabelOverride = (
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

  const updateElementPosition = (
    key: MapElementKey,
    patch: Partial<FigureSettings['elementPositions'][MapElementKey]>,
  ) => {
    setSettings((current) => ({
      ...current,
      elementPositions: {
        ...current.elementPositions,
        [key]: { ...current.elementPositions[key], ...patch },
      },
    }))
  }

  const updateElementStyle = (
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ) => {
    setSettings((current) => ({
      ...current,
      elementStyles: {
        ...current.elementStyles,
        [key]: {
          ...current.elementStyles[key],
          ...patch,
        },
      } as MapElementStyles,
    }))
  }

  const updateElementVisibility = (
    key: MapElementKey,
    visible: boolean,
  ) => {
    const visibilityKey = {
      title: 'showTitle',
      diffLegend: 'showLegend',
      wetDry: 'showWetDryKey',
      north: 'showNorth',
      scale: 'showScale',
    } as const
    setSettings((current) => ({
      ...current,
      [visibilityKey[key]]: visible,
    }))
  }

  const nudgeElement = (key: MapElementKey, dx: number, dy: number) => {
    const position = settings.elementPositions[key]
    updateElementPosition(key, {
      offX: position.offX + dx,
      offY: position.offY + dy,
    })
  }

  const resetElement = (key: MapElementKey) => {
    setSettings((current) => {
      const visibilityKey = {
        title: 'showTitle',
        diffLegend: 'showLegend',
        wetDry: 'showWetDryKey',
        north: 'showNorth',
        scale: 'showScale',
      } as const
      return {
        ...current,
        [visibilityKey[key]]: true,
        elementPositions: {
          ...current.elementPositions,
          [key]: { ...DEFAULT_ELEMENT_POSITIONS[key] },
        },
        elementStyles: {
          ...current.elementStyles,
          [key]: structuredClone(DEFAULT_ELEMENT_STYLES[key]),
        } as MapElementStyles,
      }
    })
  }

  const nudgeStationLabel = (dx: number, dy: number) => {
    if (!selectedStationLabelId || !stationingLayer) return
    const bounds = engine.commonBounds()
    const currentPoint = stationLabelPosition(
      stationingLayer,
      bounds,
      settings,
      selectedStationLabelId,
    )
    if (!currentPoint) return
    const screenPoint = mapPointToCanvas(currentPoint, bounds, settings)
    const nextPoint = canvasPointToMap(
      screenPoint.x + dx,
      screenPoint.y + dy,
      bounds,
      settings,
    )
    updateStationLabelOverride(selectedStationLabelId, {
      ...settings.centerlineStationing.overrides[selectedStationLabelId],
      labelPoint: nextPoint,
    })
  }

  const resetCenterlineStationing = () => {
    const defaults = createDefaultFigureSettings().centerlineStationing
    setSettings((current) => ({
      ...current,
      centerlineStationing: structuredClone(defaults),
    }))
    setSelectedStationLabelId(null)
  }

  const resetView = () => {
    setSettings((current) => ({
      ...current,
      rotation: 0,
      zoom: 1,
      panX: 0,
      panY: 0,
    }))
  }

  return {
    updateCenterlineStationing,
    updateStationLabelOverride,
    updateElementPosition,
    updateElementStyle,
    updateElementVisibility,
    nudgeElement,
    resetElement,
    nudgeStationLabel,
    resetCenterlineStationing,
    resetView,
  }
}
