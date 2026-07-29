import { FRAMES } from '../../../core/mapRenderer'
import type {
  ElementPosition,
  FigureSettings,
  MapElementBounds,
  MapElementKey,
} from '../../../core/types'
import type {
  MapInteractionTool,
  ScreenPoint,
} from '../../map-interactions/mapInteraction'

type FigureElementToolOptions = {
  enabled: boolean
  settings: FigureSettings
  elementBounds(): readonly MapElementBounds[]
  selectElement(key: MapElementKey): void
  updatePosition(key: MapElementKey, position: ElementPosition): void
  setDragging(dragging: boolean): void
  setHovered(key: MapElementKey | null): void
}

function elementAt(
  boundsList: readonly MapElementBounds[],
  point: ScreenPoint,
) {
  return [...boundsList]
    .reverse()
    .find(
      (bounds) =>
        point.x >= bounds.x - 6 &&
        point.x <= bounds.x + bounds.width + 6 &&
        point.y >= bounds.y - 6 &&
        point.y <= bounds.y + bounds.height + 6,
    )
}

export function createFigureElementTool({
  enabled,
  settings,
  elementBounds,
  selectElement,
  updatePosition,
  setDragging,
  setHovered,
}: FigureElementToolOptions): MapInteractionTool {
  return {
    id: 'figure-element',
    begin: ({ screenPoint }) => {
      if (!enabled) return null
      const hit = elementAt(elementBounds(), screenPoint)
      if (!hit) return null

      const originalPosition = {
        ...settings.elementPositions[hit.key],
      }
      const originalBounds = { ...hit }
      const start = { ...screenPoint }
      const move = (point: ScreenPoint) => {
        const frame = FRAMES[settings.orientation]
        const rawDx = point.x - start.x
        const rawDy = point.y - start.y
        const dx = Math.max(
          -originalBounds.x,
          Math.min(
            frame.width -
              originalBounds.x -
              originalBounds.width,
            rawDx,
          ),
        )
        const dy = Math.max(
          -originalBounds.y,
          Math.min(
            frame.height -
              originalBounds.y -
              originalBounds.height,
            rawDy,
          ),
        )
        updatePosition(hit.key, {
          ...originalPosition,
          offX: originalPosition.offX + Math.round(dx),
          offY: originalPosition.offY + Math.round(dy),
        })
      }

      selectElement(hit.key)
      setDragging(true)
      setHovered(hit.key)
      return {
        handled: true,
        capturePointer: true,
        session: {
          id: `figure-element:${hit.key}`,
          move: ({ screenPoint: point }) => move(point),
          finish: ({ screenPoint: point }) => {
            move(point)
            setDragging(false)
          },
          cancel: () => {
            updatePosition(hit.key, originalPosition)
            setDragging(false)
          },
        },
      }
    },
    hover: ({ screenPoint }) => {
      setHovered(
        enabled ? (elementAt(elementBounds(), screenPoint)?.key ?? null) : null,
      )
    },
  }
}
