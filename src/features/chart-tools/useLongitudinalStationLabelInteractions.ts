import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type {
  LongitudinalStationLabelPosition,
} from '../../core/types'
import type {
  LongitudinalStationLabelBounds,
} from './longitudinalStationLabels'
import { positionLongitudinalStationLabel } from './longitudinalStationLabels'

type DragSession = {
  id: string
  pointerId: number
  startX: number
  startY: number
  startOffset: LongitudinalStationLabelPosition
}

type Options = {
  enabled: boolean
  boundsRef: RefObject<LongitudinalStationLabelBounds[]>
  positions: Record<string, LongitudinalStationLabelPosition>
  onChange(positions: Record<string, LongitudinalStationLabelPosition>): void
}

function canvasPoint(
  event: ReactPointerEvent<HTMLCanvasElement>,
) {
  const canvas = event.currentTarget
  const bounds = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
    y: ((event.clientY - bounds.top) * canvas.height) / bounds.height,
  }
}

function hitLabel(
  point: { x: number; y: number },
  bounds: readonly LongitudinalStationLabelBounds[],
) {
  return [...bounds].reverse().find((label) => (
    point.x >= label.x
    && point.x <= label.x + label.width
    && point.y >= label.y
    && point.y <= label.y + label.height
  ))
}

export function useLongitudinalStationLabelInteractions({
  enabled,
  boundsRef,
  positions,
  onChange,
}: Options) {
  const dragRef = useRef<DragSession | null>(null)

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    const point = canvasPoint(event)
    const label = hitLabel(point, boundsRef.current ?? [])
    if (!label) return
    dragRef.current = {
      id: label.id,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startOffset: positions[label.id] ?? { offsetX: 0, offsetY: 0 },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.style.cursor = 'grabbing'
    event.preventDefault()
  }, [boundsRef, enabled, positions])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    const point = canvasPoint(event)
    const drag = dragRef.current
    if (!drag) {
      event.currentTarget.style.cursor = hitLabel(point, boundsRef.current ?? [])
        ? 'grab'
        : 'default'
      return
    }
    onChange(positionLongitudinalStationLabel(
      positions,
      drag.id,
      {
        offsetX: drag.startOffset.offsetX + point.x - drag.startX,
        offsetY: drag.startOffset.offsetY + point.y - drag.startY,
      },
    ))
  }, [boundsRef, enabled, onChange, positions])

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.currentTarget.style.cursor = 'grab'
  }, [])

  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) event.currentTarget.style.cursor = 'default'
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onPointerLeave: handlePointerLeave,
  }
}
