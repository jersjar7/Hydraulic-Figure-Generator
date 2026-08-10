import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FigureObject, MapAnnotation } from '../src/core/types'
import { mapAnnotationFigureObjectAdapter } from '../src/features/annotations/mapAnnotationFigureObject'
import {
  appendAdaptedFigureObject,
  removeAdaptedFigureObject,
  updateAdaptedFigureObject,
} from '../src/features/figure-objects/figureObjectAdapter'
import {
  removeFigureObject,
  resetFigureObject,
  selectFigureObject,
} from '../src/features/figure-objects/figureObjectCollection'
import {
  createPlotCoordinateAdapter,
  frameCoordinateAdapter,
} from '../src/features/figure-objects/figureObjectCoordinates'
import {
  beginFigureObjectDrag,
  duplicateFigureObject,
  moveFigureObjectInFrame,
  updateFigureObjectDrag,
} from '../src/features/figure-objects/figureObjectGeometry'

function object(overrides: Partial<FigureObject> = {}): FigureObject {
  return {
    id: 'note-1',
    kind: 'annotation:text',
    coordinateSpace: 'frame',
    visible: true,
    locked: false,
    zIndex: 0,
    points: [{ x: 40, y: 50 }],
    ...overrides,
  }
}

function annotation(id = 'note-1'): MapAnnotation {
  return {
    id,
    kind: 'text',
    points: [{ x: 10, y: 20 }],
    text: 'Note',
    color: '#111111',
    fillColor: '#ffffff',
    lineWidth: 2,
    fontSize: 18,
    rotation: 0,
    dashed: false,
    background: true,
  }
}

describe('shared figure-object manipulation kernel', () => {
  it('selects visible objects and respects lock state while moving', () => {
    assert.equal(
      selectFigureObject([object()], 'note-1').selectedId,
      'note-1',
    )
    assert.equal(
      selectFigureObject([object({ visible: false })], 'note-1')
        .selectedId,
      null,
    )
    const locked = object({ locked: true })
    assert.equal(
      moveFigureObjectInFrame(
        locked,
        { type: 'body' },
        { x: 20, y: 30 },
        frameCoordinateAdapter,
        { left: 0, top: 0, right: 100, bottom: 100 },
      ),
      locked,
    )
  })

  it('drags, clamps, duplicates, removes, and resets immutable objects', () => {
    const original = object()
    const drag = beginFigureObjectDrag(
      original,
      { type: 'body' },
      { x: 40, y: 50 },
    )
    const moved = updateFigureObjectDrag(
      drag,
      { x: 140, y: 150 },
      frameCoordinateAdapter,
      { left: 0, top: 0, right: 100, bottom: 100 },
      10,
    )
    assert.deepEqual(moved.points, [{ x: 90, y: 90 }])
    assert.deepEqual(original.points, [{ x: 40, y: 50 }])

    const copy = duplicateFigureObject(
      moved,
      'note-2',
      { x: -20, y: -10 },
      frameCoordinateAdapter,
      { left: 0, top: 0, right: 100, bottom: 100 },
      10,
    )
    assert.equal(copy.id, 'note-2')
    assert.deepEqual(copy.points, [{ x: 70, y: 80 }])

    const removed = removeFigureObject([original, copy], original.id)
    assert.deepEqual(removed.objects.map((item) => item.id), ['note-2'])
    assert.equal(removed.selectedId, 'note-2')
    assert.deepEqual(resetFigureObject([moved, copy], original)[0], original)
  })

  it('keeps fixed anchors in place while moving anchored labels', () => {
    const leader = object({
      kind: 'annotation:leader',
      points: [
        { x: 20, y: 20 },
        { x: 60, y: 60 },
      ],
      anchor: { pointIndex: 0, fixed: true },
      leader: { visible: true, fromPointIndex: 0, toPointIndex: 1 },
    })
    const moved = moveFigureObjectInFrame(
      leader,
      { type: 'body' },
      { x: 10, y: -5 },
      frameCoordinateAdapter,
      { left: 0, top: 0, right: 100, bottom: 100 },
    )
    assert.deepEqual(moved.points, [
      { x: 20, y: 20 },
      { x: 70, y: 55 },
    ])
    assert.equal(
      moveFigureObjectInFrame(
        leader,
        { type: 'point', pointIndex: 0 },
        { x: 25, y: 25 },
        frameCoordinateAdapter,
        { left: 0, top: 0, right: 100, bottom: 100 },
      ),
      leader,
    )
  })

  it('adapts persisted callout lock and leader visibility state', () => {
    const callout: MapAnnotation = {
      ...annotation('leader-1'),
      kind: 'leader',
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      locked: true,
      leaderVisible: false,
    }
    const object = mapAnnotationFigureObjectAdapter.toFigureObject(
      callout,
      2,
    )

    assert.equal(object.locked, true)
    assert.equal(object.leader?.visible, false)
    assert.equal(object.anchor?.pointIndex, 0)
    assert.deepEqual(
      mapAnnotationFigureObjectAdapter.fromFigureObject(callout, {
        ...object,
        locked: false,
        leader: { ...object.leader!, visible: true },
      }),
      { ...callout, locked: false, leaderVisible: true },
    )
  })

  it('adapts WSE text annotations without changing their persisted shape', () => {
    const source = annotation()
    const updated = updateAdaptedFigureObject(
      [source],
      source.id,
      mapAnnotationFigureObjectAdapter,
      (current) => ({
        ...current,
        points: [{ x: 15, y: 25 }],
      }),
    )
    assert.deepEqual(updated[0], {
      ...source,
      points: [{ x: 15, y: 25 }],
    })
    assert.equal('coordinateSpace' in updated[0], false)

    const appended = appendAdaptedFigureObject(
      updated,
      source.id,
      mapAnnotationFigureObjectAdapter,
      (current) => ({ ...current, id: 'note-2' }),
    )
    assert.deepEqual(appended.items.map((item) => item.id), [
      'note-1',
      'note-2',
    ])
    assert.equal(
      JSON.stringify(appended.items),
      JSON.stringify(structuredClone(appended.items)),
    )
    const removed = removeAdaptedFigureObject(
      appended.items,
      'note-1',
      mapAnnotationFigureObjectAdapter,
    )
    assert.deepEqual(removed.items.map((item) => item.id), ['note-2'])
    assert.equal(removed.selectedId, 'note-2')
  })

  it('converts plot coordinates to the frame and back', () => {
    const adapter = createPlotCoordinateAdapter({
      domain: { left: 0, top: 100, right: 10, bottom: 200 },
      frame: { left: 20, top: 30, right: 220, bottom: 130 },
    })
    const point = { x: 5, y: 150 }
    assert.deepEqual(adapter.toFrame(point), { x: 120, y: 80 })
    assert.deepEqual(adapter.fromFrame(adapter.toFrame(point)), point)
  })
})
