import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { buildCenterlineStationingLayers } from '../src/features/stationing/centerlineStationingSource'

function centerline(id: string, y: number) {
  return {
    id,
    overlayId: `overlay-${id}`,
    overlayName: id,
    featureIndex: 0,
    partIndex: 0,
    mapPoints: [{ x: 0, y }, { x: 200, y }],
    modelPoints: [{ x: 0, y }, { x: 200, y }],
    lengthFeet: 200,
  }
}

describe('multi-centerline stationing source', () => {
  it('builds every selected centerline with independent station origins', () => {
    const settings = createDefaultFigureSettings().centerlineStationing
    settings.minorInterval = 25
    settings.majorInterval = 100
    settings.labelInterval = 100
    const layers = buildCenterlineStationingLayers({
      centerlines: [{
        centerline: centerline('main', 0),
        direction: 'a-to-b',
        startStation: 1000,
      }, {
        centerline: centerline('fork', 50),
        direction: 'b-to-a',
        startStation: 2000,
      }],
    }, settings)

    assert.equal(layers.length, 2)
    assert.equal(layers[0].ticks[0].stationFeet, 1000)
    assert.equal(layers[1].ticks[0].stationFeet, 2000)
    assert.equal(layers[0].direction, 'a-to-b')
    assert.equal(layers[1].direction, 'b-to-a')
    assert.equal(
      new Set(layers.flatMap((layer) => layer.ticks.map((tick) => tick.id))).size,
      layers.reduce((total, layer) => total + layer.ticks.length, 0),
    )
  })

  it('keeps station override ids scoped to one centerline', () => {
    const settings = createDefaultFigureSettings().centerlineStationing
    const [layer] = buildCenterlineStationingLayers({
      centerlines: [{
        centerline: centerline('main', 0),
        direction: 'a-to-b',
        startStation: 0,
      }],
    }, settings)
    assert.match(layer.ticks[0].id, /^main:station:/)
    assert.match(layer.ticks[0].legacyId!, /^station:/)
    assert.equal(layer.allowLegacyOverrides, true)
  })
})
