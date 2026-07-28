import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  hitTestAssessmentCallout,
  mapPointToCanvas,
} from '../src/core/mapRenderer'
import type { AssessmentMapLayer, Bounds } from '../src/core/types'

const bounds: Bounds = {
  x0: 0,
  x1: 100,
  y0: 0,
  y1: 100,
}

describe('assessment WSE callouts', () => {
  it('hit-tests a callout at its engineer-positioned label point', () => {
    const settings = createDefaultFigureSettings()
    const labelPoint = { x: 72, y: 68 }
    const layer: AssessmentMapLayer = {
      lines: [],
      wseCallouts: [
        {
          lineId: 'existing-wse:52:0',
          text: 'WSE 52.0 ft',
          target: { x: 50, y: 50 },
          tangent: { x: 1, y: 0 },
          labelPoint,
        },
      ],
    }
    const screenPoint = mapPointToCanvas(labelPoint, bounds, settings)

    assert.deepEqual(
      hitTestAssessmentCallout(
        layer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      ),
      {
        lineId: 'existing-wse:52:0',
        labelPoint,
      },
    )
    assert.equal(
      hitTestAssessmentCallout(layer, bounds, settings, 0, 0),
      null,
    )
  })

  it('does not expose hidden assessment callouts to pointer interaction', () => {
    const settings = {
      ...createDefaultFigureSettings(),
      showAssessmentLabels: false,
    }
    const labelPoint = { x: 72, y: 68 }
    const layer: AssessmentMapLayer = {
      lines: [],
      wseCallouts: [
        {
          lineId: 'existing-wse:52:0',
          text: 'WSE 52.0 ft',
          target: { x: 50, y: 50 },
          tangent: { x: 1, y: 0 },
          labelPoint,
        },
      ],
    }
    const screenPoint = mapPointToCanvas(labelPoint, bounds, settings)

    assert.equal(
      hitTestAssessmentCallout(
        layer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      ),
      null,
    )
  })
})
