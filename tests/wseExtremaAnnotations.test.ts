import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createDefaultAnnotationSettings,
  createDefaultFigureSettings,
} from '../src/core/defaults'
import type { WseDifferenceExtrema } from '../src/core/hydraulicEngine'
import type { MapAnnotation } from '../src/core/types'
import {
  synchronizeWseExtremaAnnotations,
  upsertWseExtremaCallouts,
} from '../src/features/wse-difference/wseExtremaAnnotations'

const extrema: WseDifferenceExtrema = {
  rise: {
    kind: 'max-rise',
    index: 1,
    value: 0.79,
    point: { x: 100, y: 200 },
  },
  reduction: {
    kind: 'max-reduction',
    index: 2,
    value: -2.92,
    point: { x: 300, y: 400 },
  },
}

function callout(
  id: string,
  kind: 'max-rise' | 'max-reduction',
): MapAnnotation {
  return {
    id,
    kind: 'leader',
    hydraulicExtremum: kind,
    points: [
      { x: 10, y: 20 },
      { x: 40, y: 60 },
    ],
    text: 'Old',
    color: '#111111',
    fillColor: '#ffffff',
    lineWidth: 2,
    fontSize: 18,
    rotation: 0,
    dashed: false,
    background: true,
  }
}

describe('WSE extrema annotations', () => {
  it('keeps the engineer-positioned label offset when results move', () => {
    const [updated] = synchronizeWseExtremaAnnotations(
      [callout('rise', 'max-rise')],
      extrema,
    )

    assert.deepEqual(updated.points, [
      { x: 100, y: 200 },
      { x: 130, y: 240 },
    ])
    assert.equal(updated.text, 'Max WSE rise: +0.79 ft')
  })

  it('adds one callout per available extremum and removes duplicates', () => {
    let nextId = 0
    const result = upsertWseExtremaCallouts({
      annotations: [
        callout('rise', 'max-rise'),
        callout('duplicate-rise', 'max-rise'),
      ],
      extrema,
      bounds: { x0: 0, x1: 500, y0: 0, y1: 500 },
      settings: createDefaultFigureSettings(),
      defaults: createDefaultAnnotationSettings(),
      createId: () => `new-${++nextId}`,
    })

    assert.equal(result.annotations.length, 2)
    assert.equal(
      result.annotations.filter(
        (annotation) => annotation.hydraulicExtremum === 'max-rise',
      ).length,
      1,
    )
    assert.equal(
      result.annotations.find(
        (annotation) =>
          annotation.hydraulicExtremum === 'max-reduction',
      )?.text,
      'Max WSE reduction: -2.92 ft',
    )
    assert.equal(result.ids.get('max-rise'), 'rise')
    assert.equal(result.ids.get('max-reduction'), 'new-1')
  })
})
