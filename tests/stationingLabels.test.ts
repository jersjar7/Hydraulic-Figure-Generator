import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { generateCenterlineStationTicks } from '../src/core/centerlineStationing'
import {
  hitTestStationLabel,
  mapPointToCanvas,
  stationLabelPosition,
} from '../src/core/mapRenderer'
import type {
  Bounds,
  CenterlineCandidate,
  CenterlineStationLayer,
} from '../src/core/types'

const bounds: Bounds = { x0: 0, x1: 100, y0: -50, y1: 50 }

function stationLayer(): CenterlineStationLayer {
  const centerline: CenterlineCandidate = {
    id: 'centerline:0:0',
    overlayId: 'centerline',
    overlayName: 'Centerline',
    featureIndex: 0,
    partIndex: 0,
    mapPoints: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    modelPoints: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    lengthFeet: 100,
  }
  return {
    centerline,
    direction: 'a-to-b',
    ticks: generateCenterlineStationTicks(
      centerline,
      'a-to-b',
      0,
      {
        minorInterval: 25,
        majorInterval: 100,
        labelInterval: 100,
      },
    ),
  }
}

describe('centerline station labels', () => {
  it('hit-tests an automatically positioned station label', () => {
    const settings = createDefaultFigureSettings()
    settings.centerlineStationing.visible = true
    const layer = stationLayer()
    const id = 'station:0.000000'
    const point = stationLabelPosition(layer, bounds, settings, id)
    assert.ok(point)
    const screen = mapPointToCanvas(point, bounds, settings)

    assert.equal(
      hitTestStationLabel(
        layer,
        bounds,
        settings,
        screen.x,
        screen.y,
      )?.id,
      id,
    )
  })

  it('uses an engineer-positioned override and excludes a hidden label', () => {
    const settings = createDefaultFigureSettings()
    settings.centerlineStationing.visible = true
    const layer = stationLayer()
    const id = 'station:0.000000'
    const movedPoint = { x: 25, y: 30 }
    settings.centerlineStationing.overrides[id] = {
      labelPoint: movedPoint,
      text: 'Bridge station',
    }

    assert.deepEqual(
      stationLabelPosition(layer, bounds, settings, id),
      movedPoint,
    )
    const screen = mapPointToCanvas(movedPoint, bounds, settings)
    assert.equal(
      hitTestStationLabel(
        layer,
        bounds,
        settings,
        screen.x,
        screen.y,
      )?.id,
      id,
    )

    settings.centerlineStationing.overrides[id] = { visible: false }
    assert.equal(
      hitTestStationLabel(
        layer,
        bounds,
        settings,
        screen.x,
        screen.y,
      ),
      null,
    )
  })
})
