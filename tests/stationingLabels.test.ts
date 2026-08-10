import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { generateCenterlineStationTicks } from '../src/core/centerlineStationing'
import {
  hitTestStationLabel,
  mapPointToCanvas,
  stationLabelFramePosition,
  stationLabelLeaderAttachmentPoint,
  stationLabelPosition,
} from '../src/core/mapRenderer'
import { stationLabelLayouts } from '../src/core/map/stationLabelLayout'
import { FRAMES, makeMapView } from '../src/core/map/view'
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

  it('keeps a moved label fixed in the figure frame while the map view changes', () => {
    const settings = createDefaultFigureSettings()
    settings.centerlineStationing.visible = true
    const layer = stationLayer()
    const id = 'station:0.000000'
    settings.centerlineStationing.overrides[id] = {
      framePoint: { x: 0.7, y: 0.25 },
    }

    const first = stationLabelFramePosition(layer, bounds, settings, id)
    settings.zoom = 2
    settings.panX = 100
    settings.panY = -80
    const second = stationLabelFramePosition(layer, bounds, settings, id)

    assert.deepEqual(first?.labelScreenPoint, second?.labelScreenPoint)
    assert.deepEqual(first?.labelScreenPoint, {
      x: FRAMES.landscape.width * 0.7,
      y: FRAMES.landscape.height * 0.25,
    })
    assert.notDeepEqual(first?.targetScreenPoint, second?.targetScreenPoint)
  })

  it('attaches an automatic leader to the label edge', () => {
    const settings = createDefaultFigureSettings()
    settings.centerlineStationing.visible = true
    const layer = stationLayer()
    const id = 'station:0.000000'
    settings.centerlineStationing.overrides[id] = {
      framePoint: { x: 0.7, y: 0.25 },
    }
    const frame = FRAMES.landscape
    const view = makeMapView(bounds, frame, settings)
    const layout = stationLabelLayouts(
      layer,
      view,
      settings,
      frame,
      (text) => text.length * 10,
    ).find((item) => item.id === id)!
    const automatic = stationLabelLeaderAttachmentPoint(layout, 'auto')
    const left = stationLabelLeaderAttachmentPoint(layout, 'left')

    assert.ok(automatic.x < layout.labelX)
    assert.equal(left.x, layout.labelX - layout.width / 2 - 3)
    assert.equal(left.y, layout.labelY)
  })
})
