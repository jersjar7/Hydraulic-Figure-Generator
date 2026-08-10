import { FRAMES } from '../../core/mapRenderer'
import type {
  ElementPosition,
  FigureSettings,
  MapElementBounds,
  MapElementKey,
} from '../../core/types'
import {
  beginFigureObjectDrag,
  updateFigureObjectDrag,
} from '../figure-objects/figureObjectGeometry'
import { frameCoordinateAdapter } from '../figure-objects/figureObjectCoordinates'
import type {
  MapInteractionTool,
  ScreenPoint,
} from '../map-interactions/mapInteraction'
import {
  figureElementAt,
  mapElementFigureObject,
  positionFromMovedMapElement,
} from './figureElementOperations'

type Options = {
  enabled: boolean
  settings: FigureSettings
  elementBounds(): readonly MapElementBounds[]
  selectElement(key: MapElementKey): void
  previewPosition(key: MapElementKey, position: ElementPosition): void
  commitPosition(
    key: MapElementKey,
    before: ElementPosition,
    after: ElementPosition,
  ): void
  setDragging(dragging: boolean): void
  setHovered(key: MapElementKey | null): void
}

export function createFigureElementInteractionTool({
  enabled,
  settings,
  elementBounds,
  selectElement,
  previewPosition,
  commitPosition,
  setDragging,
  setHovered,
}: Options): MapInteractionTool {
  return {
    id: 'figure-element',
    begin: ({ screenPoint }) => {
      if (!enabled) return null
      const boundsList = elementBounds()
      const hit = figureElementAt(boundsList, screenPoint)
      if (!hit) return null

      selectElement(hit.key)
      setHovered(hit.key)
      const object = mapElementFigureObject(
        hit,
        settings,
        boundsList.indexOf(hit),
      )
      if (object.locked) return { handled: true }

      const before = { ...settings.elementPositions[hit.key] }
      const drag = beginFigureObjectDrag(
        object,
        { type: 'body' },
        screenPoint,
      )
      const frame = FRAMES[settings.orientation]
      let after = before
      const move = (point: ScreenPoint) => {
        const moved = updateFigureObjectDrag(
          drag,
          point,
          frameCoordinateAdapter,
          { left: 0, top: 0, right: frame.width, bottom: frame.height },
        )
        after = positionFromMovedMapElement(before, object, moved)
        previewPosition(hit.key, after)
      }

      setDragging(true)
      return {
        handled: true,
        capturePointer: true,
        session: {
          id: `figure-element:${hit.key}`,
          move: ({ screenPoint: point }) => move(point),
          finish: ({ screenPoint: point }) => {
            move(point)
            commitPosition(hit.key, before, after)
            setDragging(false)
          },
          cancel: () => {
            previewPosition(hit.key, before)
            setDragging(false)
          },
        },
      }
    },
    hover: ({ screenPoint }) => {
      setHovered(
        enabled
          ? figureElementAt(elementBounds(), screenPoint)?.key ?? null
          : null,
      )
    },
  }
}
