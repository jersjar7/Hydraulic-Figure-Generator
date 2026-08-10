import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { stationLabelFramePosition } from '../src/core/mapRenderer'
import type { StationLabelOverride } from '../src/core/types'
import { buildCenterlineStationingLayers } from '../src/features/stationing/centerlineStationingSource'
import {
  moveStationLabelOverrideInFrame,
  resetStationLabelPosition,
} from '../src/features/stationing/stationLabelFigureObject'
import { createStationLabelInteractionTool } from '../src/features/stationing/stationLabelInteractionTool'

const bounds = { x0: 0, x1: 100, y0: -50, y1: 50 }

function setup() {
  const settings = createDefaultFigureSettings()
  settings.centerlineStationing.visible = true
  const centerline = {
    id: 'main',
    overlayId: 'overlay',
    overlayName: 'Main',
    featureIndex: 0,
    partIndex: 0,
    mapPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    modelPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    lengthFeet: 100,
  }
  const [layer] = buildCenterlineStationingLayers({
    centerlines: [{ centerline, direction: 'a-to-b', startStation: 0 }],
  }, settings.centerlineStationing)
  const id = layer.ticks.find((tick) => tick.label)!.id
  const geometry = stationLabelFramePosition(layer, bounds, settings, id)!
  return { settings, layer, id, geometry }
}

describe('anchored station-label manipulation', () => {
  it('moves only the frame-positioned label and preserves leader style', () => {
    const { settings, id, geometry } = setup()
    const moved = moveStationLabelOverrideInFrame({
      id,
      geometry,
      override: {
        labelPoint: { x: 3, y: 4 },
        text: 'Bridge',
        leaderColor: '#ff0000',
        leaderDashed: true,
      },
      delta: { x: 80, y: -40 },
      settings,
    })

    assert.equal(moved.labelPoint, undefined)
    assert.equal(moved.text, 'Bridge')
    assert.equal(moved.leaderColor, '#ff0000')
    assert.equal(moved.leaderDashed, true)
    assert.ok(moved.framePoint!.x > geometry.framePoint.x)
    assert.ok(moved.framePoint!.y < geometry.framePoint.y)
    assert.deepEqual(resetStationLabelPosition(moved), {
      text: 'Bridge',
      leaderColor: '#ff0000',
      leaderDashed: true,
    })
  })

  it('selects a centerline-scoped label and drags it through the shared tool', () => {
    const { settings, layer, id, geometry } = setup()
    let selected: [string, string] | null = null
    let override: StationLabelOverride | null = null
    let dragging = false
    const tool = createStationLabelInteractionTool({
      enabled: true,
      layers: [layer],
      bounds,
      settings,
      selectLabel: (labelId, centerlineId) => {
        selected = [labelId, centerlineId]
      },
      updateOverride: (_labelId, value) => {
        override = value
      },
      setDragging: (value) => {
        dragging = value
      },
    })
    const start = {
      screenPoint: geometry.labelScreenPoint,
      mapPoint: { x: 0, y: 0 },
    }
    const result = tool.begin(start)
    assert.ok(result?.session)
    assert.deepEqual(selected, [id, 'main'])
    assert.equal(dragging, true)

    result.session.move?.({
      screenPoint: {
        x: start.screenPoint.x + 60,
        y: start.screenPoint.y + 30,
      },
      mapPoint: { x: 10, y: 10 },
    })
    assert.ok(override)
    assert.ok((override as { framePoint: { x: number } }).framePoint.x > 0)
    result.session.finish?.({
      screenPoint: {
        x: start.screenPoint.x + 60,
        y: start.screenPoint.y + 30,
      },
      mapPoint: { x: 10, y: 10 },
    })
    assert.equal(dragging, false)
  })

  it('restores a legacy override when a drag is cancelled', () => {
    const { settings, layer, id } = setup()
    const tick = layer.ticks.find((item) => item.id === id)!
    const legacyOverride = {
      labelPoint: { x: 20, y: 10 },
      text: 'Legacy station',
    }
    settings.centerlineStationing.overrides[tick.legacyId!] = legacyOverride
    const geometry = stationLabelFramePosition(layer, bounds, settings, id)!
    let restored: StationLabelOverride | null = null
    const result = createStationLabelInteractionTool({
      enabled: true,
      layers: [layer],
      bounds,
      settings,
      selectLabel: () => undefined,
      updateOverride: (_labelId, value) => {
        restored = value
      },
      setDragging: () => undefined,
    }).begin({
      screenPoint: geometry.labelScreenPoint,
      mapPoint: geometry.labelPoint,
    })

    assert.ok(result?.session)
    result.session.cancel?.()
    assert.deepEqual(restored, legacyOverride)
  })
})
