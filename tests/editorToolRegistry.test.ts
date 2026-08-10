import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  defineEditorTools,
  editorToolById,
} from '../src/features/tools/editorToolModule'
import {
  WSE_ANNOTATION_TOOLS,
  wseAnnotationToolById,
} from '../src/features/wse-difference/annotationTools'
import { MANUAL_ANNOTATION_TOOLS } from '../src/features/annotations/annotationTools'

describe('editor tool module registry', () => {
  it('publishes one reusable manual annotation suite', () => {
    assert.deepEqual(
      MANUAL_ANNOTATION_TOOLS.map((tool) => tool.id),
      ['select', 'text', 'leader', 'arrow', 'line'],
    )
    assert.deepEqual(
      WSE_ANNOTATION_TOOLS.slice(0, MANUAL_ANNOTATION_TOOLS.length),
      MANUAL_ANNOTATION_TOOLS,
    )
  })

  it('defines the WSE annotation workflow in one ordered registry', () => {
    assert.deepEqual(
      WSE_ANNOTATION_TOOLS.map((tool) => tool.id),
      [
        'select',
        'text',
        'leader',
        'arrow',
        'line',
        'result',
        'extrema',
      ],
    )
    assert.equal(wseAnnotationToolById('select').activation, 'select')
    assert.equal(wseAnnotationToolById('leader').activation, 'segment')
    assert.equal(
      wseAnnotationToolById('result').editor.resultField,
      true,
    )
    assert.equal(wseAnnotationToolById('extrema').activation, 'instant')
  })

  it('rejects duplicate tool identifiers', () => {
    assert.throws(
      () =>
        defineEditorTools([
          {
            id: 'same',
            label: 'One',
            icon: wseAnnotationToolById('select').icon,
            activation: 'select',
            requiresScene: false,
          },
          {
            id: 'same',
            label: 'Two',
            icon: wseAnnotationToolById('select').icon,
            activation: 'point',
            requiresScene: false,
          },
        ]),
      /Duplicate editor tool id/,
    )
  })

  it('fails loudly when a requested tool is not registered', () => {
    assert.throws(
      () =>
        editorToolById(
          WSE_ANNOTATION_TOOLS,
          'missing' as (typeof WSE_ANNOTATION_TOOLS)[number]['id'],
        ),
      /Unknown editor tool/,
    )
  })
})
