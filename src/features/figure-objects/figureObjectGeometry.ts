import type {
  FigureObject,
  FigureObjectBounds,
  FigureObjectDragTarget,
  FigureObjectPoint,
} from '../../core/types'
import {
  assertCoordinateSpace,
  type FigureCoordinateAdapter,
} from './figureObjectCoordinates'

export type FigureObjectDrag = Readonly<{
  object: FigureObject
  target: FigureObjectDragTarget
  start: FigureObjectPoint
}>

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function movablePointIndexes(
  object: FigureObject,
  target: FigureObjectDragTarget,
) {
  if (target.type === 'point') return [target.pointIndex]
  return object.points
    .map((_, index) => index)
    .filter(
      (index) =>
        !object.anchor?.fixed || object.anchor.pointIndex !== index,
    )
}

function translatedFramePoints(
  object: FigureObject,
  adapter: FigureCoordinateAdapter,
  target: FigureObjectDragTarget,
  delta: FigureObjectPoint,
) {
  const movable = new Set(movablePointIndexes(object, target))
  return object.points.map((point, index) => {
    const framePoint = adapter.toFrame(point)
    return movable.has(index)
      ? { x: framePoint.x + delta.x, y: framePoint.y + delta.y }
      : framePoint
  })
}

function clampBodyDelta(
  points: readonly FigureObjectPoint[],
  movable: readonly number[],
  frame: FigureObjectBounds,
  padding: number,
) {
  const moved = movable
    .map((index) => points[index])
    .filter((point): point is FigureObjectPoint => Boolean(point))
  if (moved.length === 0) return { x: 0, y: 0 }
  const left = Math.min(...moved.map((point) => point.x))
  const right = Math.max(...moved.map((point) => point.x))
  const top = Math.min(...moved.map((point) => point.y))
  const bottom = Math.max(...moved.map((point) => point.y))
  const minX = frame.left + padding
  const maxX = frame.right - padding
  const minY = frame.top + padding
  const maxY = frame.bottom - padding
  return {
    x: left < minX ? minX - left : right > maxX ? maxX - right : 0,
    y: top < minY ? minY - top : bottom > maxY ? maxY - bottom : 0,
  }
}

export function moveFigureObjectInFrame(
  object: FigureObject,
  target: FigureObjectDragTarget,
  delta: FigureObjectPoint,
  adapter: FigureCoordinateAdapter,
  frame: FigureObjectBounds,
  padding = 0,
): FigureObject {
  if (object.locked || !object.visible) return object
  assertCoordinateSpace(object.coordinateSpace, adapter)
  const indexes = movablePointIndexes(object, target)
  if (indexes.length === 0) return object
  let points = translatedFramePoints(object, adapter, target, delta)
  if (target.type === 'body') {
    const correction = clampBodyDelta(points, indexes, frame, padding)
    points = points.map((point, index) =>
      indexes.includes(index)
        ? { x: point.x + correction.x, y: point.y + correction.y }
        : point,
    )
  } else if (points[target.pointIndex]) {
    points[target.pointIndex] = {
      x: clamp(
        points[target.pointIndex].x,
        frame.left + padding,
        frame.right - padding,
      ),
      y: clamp(
        points[target.pointIndex].y,
        frame.top + padding,
        frame.bottom - padding,
      ),
    }
  }
  return {
    ...object,
    points: points.map((point) => adapter.fromFrame(point)),
  }
}

export function beginFigureObjectDrag(
  object: FigureObject,
  target: FigureObjectDragTarget,
  start: FigureObjectPoint,
): FigureObjectDrag {
  return { object, target, start: { ...start } }
}

export function updateFigureObjectDrag(
  drag: FigureObjectDrag,
  current: FigureObjectPoint,
  adapter: FigureCoordinateAdapter,
  frame: FigureObjectBounds,
  padding = 0,
) {
  return moveFigureObjectInFrame(
    drag.object,
    drag.target,
    { x: current.x - drag.start.x, y: current.y - drag.start.y },
    adapter,
    frame,
    padding,
  )
}

export function duplicateFigureObject(
  object: FigureObject,
  id: string,
  offset: FigureObjectPoint,
  adapter: FigureCoordinateAdapter,
  frame: FigureObjectBounds,
  padding = 0,
): FigureObject {
  const copy = { ...object, id, locked: false }
  return moveFigureObjectInFrame(
    copy,
    { type: 'body' },
    offset,
    adapter,
    frame,
    padding,
  )
}
