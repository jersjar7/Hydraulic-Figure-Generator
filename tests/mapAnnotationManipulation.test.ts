import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import type { MapAnnotation } from '../src/core/types'
import {
  duplicateMapAnnotationFigureObject,
  nudgeMapAnnotationFigureObjectCommand,
  resetMapAnnotationPositionCommand,
  setMapAnnotationLockedCommand,
  setMapCalloutLeaderVisibleCommand,
} from '../src/features/annotations/mapAnnotationManipulation'

function callout(): MapAnnotation {
  return {
    id: 'callout-1',
    kind: 'leader',
    points: [
      { x: 20, y: 20 },
      { x: 80, y: 80 },
    ],
    defaultPoints: [
      { x: 10, y: 10 },
      { x: 70, y: 70 },
    ],
    text: 'Review',
    color: '#111111',
    fillColor: '#ffffff',
    lineWidth: 2,
    fontSize: 18,
    rotation: 0,
    dashed: false,
    background: true,
  }
}

describe('map annotation figure-object manipulation', () => {
  it('nudges only an anchored callout label', () => {
    const source = callout()
    const command = nudgeMapAnnotationFigureObjectCommand({
      id: source.id,
      dx: 20,
      dy: -10,
      bounds: { x0: 0, y0: 0, x1: 100, y1: 100 },
      settings: createDefaultFigureSettings(),
    })
    const [moved] = command.apply([source])

    assert.deepEqual(moved.points[0], source.points[0])
    assert.notDeepEqual(moved.points[1], source.points[1])
  })

  it('duplicates callouts unlocked with a new reset baseline', () => {
    const source = {
      ...callout(),
      locked: true,
      hydraulicExtremum: 'max-rise' as const,
    }
    const copy = duplicateMapAnnotationFigureObject({
      annotation: source,
      index: 0,
      id: 'callout-2',
      bounds: { x0: 0, y0: 0, x1: 100, y1: 100 },
      settings: createDefaultFigureSettings(),
    })

    assert.equal(copy.id, 'callout-2')
    assert.equal(copy.locked, false)
    assert.equal(copy.hydraulicExtremum, undefined)
    assert.deepEqual(copy.defaultPoints, copy.points)
  })

  it('locks, hides the leader, and resets without mutating the source', () => {
    const source = callout()
    const locked = setMapAnnotationLockedCommand({
      id: source.id,
      locked: true,
    }).apply([source])
    const hidden = setMapCalloutLeaderVisibleCommand({
      id: source.id,
      visible: false,
    }).apply(locked)
    const blockedReset = resetMapAnnotationPositionCommand({
      id: source.id,
      points: source.defaultPoints!,
    }).apply(hidden)
    const unlocked = setMapAnnotationLockedCommand({
      id: source.id,
      locked: false,
    }).apply(blockedReset)
    const reset = resetMapAnnotationPositionCommand({
      id: source.id,
      points: source.defaultPoints!,
    }).apply(unlocked)

    assert.equal(source.locked, undefined)
    assert.equal(blockedReset, hidden)
    assert.equal(reset[0].locked, false)
    assert.equal(reset[0].leaderVisible, false)
    assert.deepEqual(reset[0].points, source.defaultPoints)
  })
})
