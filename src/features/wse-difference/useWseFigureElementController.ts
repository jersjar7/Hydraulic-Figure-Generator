import type { Dispatch, SetStateAction } from 'react'
import {
  DEFAULT_ELEMENT_STYLES,
} from '../../core/figureElements'
import {
  DEFAULT_ELEMENT_POSITIONS,
} from '../../core/mapRenderer'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  CenterlineStationLayer,
  FigureSettings,
  MapElementKey,
  MapElementStyles,
} from '../../core/types'
import { useCenterlineStationingController } from '../stationing/useCenterlineStationingController'

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
  const stationing = useCenterlineStationingController({
    bounds: engine.commonBounds(),
    settings,
    stationingLayer,
    selectedLabelId: selectedStationLabelId,
    setSettings,
    setSelectedLabelId: setSelectedStationLabelId,
  })

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
    updateCenterlineStationing: stationing.update,
    updateStationLabelOverride: stationing.updateLabelOverride,
    updateElementPosition,
    updateElementStyle,
    updateElementVisibility,
    nudgeElement,
    resetElement,
    nudgeStationLabel: stationing.nudgeSelectedLabel,
    resetCenterlineStationing: stationing.reset,
    resetView,
  }
}
