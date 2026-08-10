import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { MapAnnotation } from '../src/core/types'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { hitTestAnnotation, mapPointToCanvas } from '../src/core/mapRenderer'
import { annotationCapabilities } from '../src/features/annotations/annotationCapabilities'
import { reorderSelectedAnnotation } from '../src/features/annotations/annotationEditorOperations'
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

  it('reorders annotations without mutating the original collection', () => {
    const annotations = [annotation('back'), annotation('middle'), annotation('front')]
    const reordered = reorderSelectedAnnotation(annotations, 'middle', 1)

    assert.deepEqual(annotations.map((item) => item.id), ['back', 'middle', 'front'])
    assert.deepEqual(reordered.map((item) => item.id), ['back', 'front', 'middle'])
    assert.equal(reorderSelectedAnnotation(reordered, 'middle', 1), reordered)
  })

  it('does not hit-test a hidden annotation', () => {
    const bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }
    const settings = createDefaultFigureSettings()
    const hidden = { ...annotation('hidden'), visible: false }
    const point = mapPointToCanvas(hidden.points[0], bounds, settings)

    assert.equal(
      hitTestAnnotation([hidden], bounds, settings, point.x, point.y),
      null,
    )
  })
})
