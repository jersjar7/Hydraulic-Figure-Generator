import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { projectGeometry } from '../src/core/hydraulics/geometryProjection'
import { normalizeSmsWkt } from '../src/core/hydraulics/smsH5Reader'

describe('SMS geometry projection recovery', () => {
  it('treats SMS placeholder WKT values as missing', () => {
    assert.equal(normalizeSmsWkt('*'), null)
    assert.equal(normalizeSmsWkt('  ***  '), null)
    assert.equal(normalizeSmsWkt(''), null)
    assert.equal(normalizeSmsWkt('EPSG:2927'), 'EPSG:2927')
  })

  it('reports a recovery-oriented message for missing projection metadata', () => {
    assert.throws(
      () => projectGeometry({
        meshName: 'EX_Mesh',
        N: 1,
        xy: new Float64Array([0, 0]),
        z: new Float32Array([0]),
        tris: new Uint32Array(),
        wkt: null,
      }),
      /valid mesh geometry.*coordinate system is missing.*CRS override/i,
    )
  })
})
