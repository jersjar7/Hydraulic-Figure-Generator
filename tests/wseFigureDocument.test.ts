import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createWseFigureDocument,
  wseFigureDocumentReducer,
} from '../src/features/wse-difference/wseFigureDocument'

describe('WSE figure document', () => {
  it('owns persisted figure state independently from transient UI state', () => {
    const initial = createWseFigureDocument()
    const updated = wseFigureDocumentReducer(initial, {
      type: 'settings/set',
      value: (settings) => ({ ...settings, dryDepth: 0.25 }),
    })

    assert.equal(initial.settings.dryDepth, 0)
    assert.equal(updated.settings.dryDepth, 0.25)
    assert.equal(updated.annotations, initial.annotations)
  })

  it('loads and resets the complete persisted document', () => {
    const initial = createWseFigureDocument()
    const loaded = {
      ...initial,
      settings: { ...initial.settings, zoom: 2 },
      annotations: [
        {
          id: 'note',
          kind: 'text' as const,
          points: [{ x: 10, y: 20 }],
          text: 'Review',
          color: '#111111',
          fillColor: '#ffffff',
          lineWidth: 2,
          fontSize: 18,
          rotation: 0,
          dashed: false,
          background: true,
        },
      ],
    }

    const replaced = wseFigureDocumentReducer(initial, {
      type: 'document/load',
      document: loaded,
    })
    const reset = wseFigureDocumentReducer(replaced, {
      type: 'document/reset',
    })

    assert.equal(replaced, loaded)
    assert.equal(reset.settings.zoom, 1)
    assert.deepEqual(reset.annotations, [])
  })
})
