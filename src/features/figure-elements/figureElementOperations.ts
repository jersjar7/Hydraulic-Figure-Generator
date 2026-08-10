import {
  DEFAULT_ELEMENT_STYLES,
} from '../../core/figureElements'
import { DEFAULT_ELEMENT_POSITIONS } from '../../core/mapRenderer'
import type {
  ElementPosition,
  FigureObject,
  FigureSettings,
  MapElementBounds,
  MapElementKey,
  MapElementStyles,
} from '../../core/types'

const VISIBILITY_KEYS = {
  title: 'showTitle',
  diffLegend: 'showLegend',
  wetDry: 'showWetDryKey',
  north: 'showNorth',
  scale: 'showScale',
} as const satisfies Record<MapElementKey, keyof FigureSettings>

export type FigureElementState = Pick<
  FigureSettings,
  | 'showTitle'
  | 'showLegend'
  | 'showWetDryKey'
  | 'showNorth'
  | 'showScale'
  | 'elementPositions'
  | 'elementStyles'
>

export function figureElementState(
  settings: FigureSettings,
): FigureElementState {
  return {
    showTitle: settings.showTitle,
    showLegend: settings.showLegend,
    showWetDryKey: settings.showWetDryKey,
    showNorth: settings.showNorth,
    showScale: settings.showScale,
    elementPositions: settings.elementPositions,
    elementStyles: settings.elementStyles,
  }
}

export function withFigureElementState<Settings extends FigureSettings>(
  settings: Settings,
  elements: FigureElementState,
): Settings {
  return { ...settings, ...elements }
}

export function isMapElementVisible(
  settings: FigureElementState,
  key: MapElementKey,
) {
  return Boolean(settings[VISIBILITY_KEYS[key]])
}

export function withMapElementPosition<Settings extends FigureElementState>(
  settings: Settings,
  key: MapElementKey,
  position: ElementPosition,
): Settings {
  return {
    ...settings,
    elementPositions: {
      ...settings.elementPositions,
      [key]: position,
    },
  }
}

export function patchMapElementPosition<Settings extends FigureElementState>(
  settings: Settings,
  key: MapElementKey,
  patch: Partial<ElementPosition>,
) {
  return withMapElementPosition(settings, key, {
    ...settings.elementPositions[key],
    ...patch,
  })
}

export function patchMapElementStyle<Settings extends FigureElementState>(
  settings: Settings,
  key: MapElementKey,
  patch: Partial<MapElementStyles[MapElementKey]>,
): Settings {
  return {
    ...settings,
    elementStyles: {
      ...settings.elementStyles,
      [key]: { ...settings.elementStyles[key], ...patch },
    } as MapElementStyles,
  }
}

export function withMapElementVisibility<Settings extends FigureElementState>(
  settings: Settings,
  key: MapElementKey,
  visible: boolean,
): Settings {
  return { ...settings, [VISIBILITY_KEYS[key]]: visible }
}

export function resetMapElement<Settings extends FigureElementState>(
  settings: Settings,
  key: MapElementKey,
): Settings {
  return {
    ...withMapElementVisibility(settings, key, true),
    elementPositions: {
      ...settings.elementPositions,
      [key]: { ...DEFAULT_ELEMENT_POSITIONS[key], locked: false },
    },
    elementStyles: {
      ...settings.elementStyles,
      [key]: structuredClone(DEFAULT_ELEMENT_STYLES[key]),
    } as MapElementStyles,
  }
}

export function figureElementAt(
  boundsList: readonly MapElementBounds[],
  point: { x: number; y: number },
) {
  return [...boundsList]
    .reverse()
    .find(
      (bounds) =>
        point.x >= bounds.x - 6 &&
        point.x <= bounds.x + bounds.width + 6 &&
        point.y >= bounds.y - 6 &&
        point.y <= bounds.y + bounds.height + 6,
    ) ?? null
}

export function mapElementFigureObject(
  bounds: MapElementBounds,
  settings: FigureSettings,
  zIndex = 0,
): FigureObject {
  return {
    id: bounds.key,
    kind: `map-element:${bounds.key}`,
    coordinateSpace: 'frame',
    visible: isMapElementVisible(settings, bounds.key),
    locked: settings.elementPositions[bounds.key].locked ?? false,
    zIndex,
    points: [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ],
    bounds: {
      left: bounds.x,
      top: bounds.y,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height,
    },
  }
}

export function positionFromMovedMapElement(
  position: ElementPosition,
  original: FigureObject,
  moved: FigureObject,
): ElementPosition {
  return {
    ...position,
    offX: position.offX + Math.round(moved.points[0].x - original.points[0].x),
    offY: position.offY + Math.round(moved.points[0].y - original.points[0].y),
  }
}
