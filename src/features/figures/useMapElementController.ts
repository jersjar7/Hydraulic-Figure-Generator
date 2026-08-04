import type { Dispatch, SetStateAction } from 'react'
import { DEFAULT_ELEMENT_STYLES } from '../../core/figureElements'
import { DEFAULT_ELEMENT_POSITIONS } from '../../core/mapRenderer'
import type {
  FigureSettings,
  MapElementKey,
  MapElementStyles,
} from '../../core/types'

export function useMapElementController<Settings extends FigureSettings>(
  settings: Settings,
  setSettings: Dispatch<SetStateAction<Settings>>,
) {
  const updateElementPosition = (
    key: MapElementKey,
    patch: Partial<Settings['elementPositions'][MapElementKey]>,
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
        [key]: { ...current.elementStyles[key], ...patch },
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
    setSettings((current) => ({
      ...current,
      elementPositions: {
        ...current.elementPositions,
        [key]: {
          ...current.elementPositions[key],
          offX: position.offX + dx,
          offY: position.offY + dy,
        },
      },
    }))
  }

  const resetElement = (key: MapElementKey) => {
    setSettings((current) => ({
      ...current,
      elementPositions: {
        ...current.elementPositions,
        [key]: { ...DEFAULT_ELEMENT_POSITIONS[key] },
      },
      elementStyles: {
        ...current.elementStyles,
        [key]: structuredClone(DEFAULT_ELEMENT_STYLES[key]),
      } as MapElementStyles,
    }))
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
    updateElementPosition,
    updateElementStyle,
    updateElementVisibility,
    nudgeElement,
    resetElement,
    resetView,
  }
}
