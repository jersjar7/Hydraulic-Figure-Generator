import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { MapAnnotation } from '../src/core/types'
import { annotationCapabilities } from '../src/features/annotations/annotationCapabilities'
import {
  removeAnnotation,
  translateAnnotation,
  updateAnnotation,
} from '../src/features/annotations/annotationCollection'

function annotation(
  id: string,
  kind: MapAnnotation['kind'] = 'text',
): MapAnnotation {
  return {
    id,
    kind,
    points: [{ x: 10, y: 20 }],
    text: id,
    color: '#111111',
    fillColor: '#ffffff',
    lineWidth: 2,
    fontSize: 18,
    rotation: 0,
    dashed: false,
    background: true,
  }
}

describe('reusable annotation capabilities', () => {
  it('describes content and hydraulic result editors by annotation kind', () => {
    assert.equal(annotationCapabilities(annotation('line', 'line')).content, false)
    assert.equal(annotationCapabilities(annotation('text')).typography, true)
    assert.equal(
      annotationCapabilities(annotation('result', 'result')).resultField,
      true,
    )
  })

  it('updates and removes annotations without mutating the collection', () => {
    const annotations = [annotation('one'), annotation('two')]
    const updated = updateAnnotation(annotations, 'one', {
      color: '#ff0000',
    })
    const removed = removeAnnotation(updated, 'one')

    assert.equal(annotations[0].color, '#111111')
    assert.equal(updated[0].color, '#ff0000')
    assert.deepEqual(removed.annotations.map((item) => item.id), ['two'])
    assert.equal(removed.selectedId, 'two')
  })

  it('keeps a hydraulic extremum target fixed while moving its label', () => {
    const extremum = {
      ...annotation('rise', 'result'),
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      hydraulicExtremum: 'max-rise' as const,
    }
    const moved = translateAnnotation(extremum, 5, -5)

    assert.deepEqual(moved.points, [
      { x: 10, y: 20 },
      { x: 35, y: 35 },
    ])
  })
})
