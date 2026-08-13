import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createOverlayId } from '../src/core/map/overlayIdentity'

describe('map overlay identity', () => {
  it('creates unique ids for overlays imported in one rapid batch', () => {
    const ids = Array.from({ length: 100 }, createOverlayId)

    assert.equal(new Set(ids).size, ids.length)
    assert.equal(ids.every((id) => id.startsWith('overlay-')), true)
  })
})
