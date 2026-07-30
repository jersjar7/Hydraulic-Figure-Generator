import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createHydraulicProjectDocument,
  hydraulicProjectDocumentReducer,
} from '../src/features/project-document/hydraulicProjectDocument'

describe('shared hydraulic project document', () => {
  it('owns overlays independently from any figure document', () => {
    const initial = createHydraulicProjectDocument()
    const updated = hydraulicProjectDocumentReducer(initial, {
      type: 'overlays/set',
      value: [
        {
          id: 'row',
          name: 'ROW',
          visible: true,
          color: '#ff0000',
          width: 2,
          fillColor: '#ff0000',
          fillOpacity: 0.15,
          geometryType: 'line',
          features: [],
        },
      ],
    })

    assert.deepEqual(initial.overlays, [])
    assert.equal(updated.overlays.length, 1)
    assert.equal(updated.overlays[0].name, 'ROW')
  })

  it('loads and resets all shared project state', () => {
    const initial = createHydraulicProjectDocument()
    const loaded = hydraulicProjectDocumentReducer(initial, {
      type: 'document/load',
      document: { overlays: [] },
    })
    const reset = hydraulicProjectDocumentReducer(loaded, {
      type: 'document/reset',
    })

    assert.deepEqual(reset, createHydraulicProjectDocument())
  })
})
