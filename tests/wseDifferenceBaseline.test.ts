import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createCanvas } from '@napi-rs/canvas'
import { createDefaultFigureSettings } from '../src/core/defaults'
import {
  FRAMES,
  renderWseDifferenceMap,
} from '../src/core/mapRenderer'
import type {
  ConditionData,
  ProjectedGeometry,
  RunSelection,
  WseDifferenceScene,
} from '../src/core/types'

function syntheticGeometry(): ProjectedGeometry {
  return {
    meshName: 'Synthetic mesh',
    N: 4,
    xy: new Float64Array([0, 0, 100, 0, 0, 100, 100, 100]),
    z: new Float32Array([0, 0, 0, 0]),
    tris: new Uint32Array([0, 1, 2, 1, 3, 2]),
    wkt: null,
    lon: new Float64Array([0, 0, 0, 0]),
    lat: new Float64Array([0, 0, 0, 0]),
    mx: new Float64Array([0, 100, 0, 100]),
    my: new Float64Array([0, 0, 100, 100]),
    bbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
    xyBbox: { x0: 0, x1: 100, y0: 0, y1: 100 },
    ftPerMerc: 1,
  }
}

function runSelection(
  key: string,
  label: string,
  name: string,
  projected: ProjectedGeometry,
): RunSelection {
  const condition: ConditionData = {
    key,
    label,
    kind: key === 'EX' ? 'existing' : 'proposed',
    projected,
    geometry: projected,
    datasets: { runs: [{ name, params: {} }] },
  }
  return {
    key,
    condition,
    run: condition.datasets!.runs[0],
    index: 0,
  }
}

function syntheticScene(): WseDifferenceScene {
  const existingGeometry = syntheticGeometry()
  const proposedGeometry = syntheticGeometry()
  return {
    existing: runSelection(
      'EX',
      'Existing',
      'Existing 100YR',
      existingGeometry,
    ),
    proposed: runSelection(
      'PR',
      'Proposed',
      'Proposed 100YR',
      proposedGeometry,
    ),
    projected: existingGeometry,
    proposedProjected: proposedGeometry,
    existingWse: new Float32Array([10, 10, 10, 10]),
    proposedWse: new Float32Array([9, 10.5, 11, 9.5]),
    existingDepth: new Float32Array([1, 1, 1, 1]),
    proposedDepth: new Float32Array([1, 1, 1, 1]),
    diff: new Float32Array([-1, 0.5, 1, -0.5]),
    wetDry: new Int8Array([0, 1, -1, 0]),
    proposedWetDry: new Int8Array([0, 0, 0, 0]),
    proposedWseWet: new Float32Array([9, 10.5, 11, 9.5]),
    maxAbs: 1,
    validDifferenceNodes: 4,
  }
}

describe('WSE Difference production baseline', () => {
  it('keeps the accepted engineering defaults explicit', () => {
    const settings = createDefaultFigureSettings()

    assert.equal(settings.dryDepth, 0)
    assert.equal(settings.assessmentLineInterval, 1)
    assert.equal(settings.showDifferenceOutlines, true)
    assert.equal(settings.showWetDry, true)
    assert.equal(settings.showAssessmentLines, true)
    assert.equal(settings.showAssessmentLabels, true)
    assert.equal(settings.legendBound, null)
    assert.equal(settings.legendInterval, null)
    assert.equal(settings.centerlineStationing.visible, false)
    assert.deepEqual(FRAMES, {
      landscape: { width: 1650, height: 1275 },
      portrait: { width: 1275, height: 1650 },
    })
  })

  it('renders a deterministic synthetic comparison in both report frames', async () => {
    const scene = syntheticScene()
    const commonBounds = { x0: 0, x1: 100, y0: 0, y1: 100 }

    for (const orientation of ['landscape', 'portrait'] as const) {
      const settings = {
        ...createDefaultFigureSettings(),
        orientation,
        basemapOpacity: 0,
        showOverlays: false,
      }
      const frame = FRAMES[orientation]
      const canvas = createCanvas(frame.width, frame.height)
      const elements = await renderWseDifferenceMap(
        canvas as unknown as HTMLCanvasElement,
        scene,
        commonBounds,
        settings,
        [],
      )

      assert.equal(canvas.width, frame.width)
      assert.equal(canvas.height, frame.height)
      assert.deepEqual(
        elements.map((element) => element.key),
        ['title', 'diffLegend', 'north', 'scale', 'wetDry'],
      )
      assert.equal(
        elements.every(
          (element) =>
            element.x >= 0 &&
            element.y >= 0 &&
            element.x + element.width <= frame.width &&
            element.y + element.height <= frame.height,
        ),
        true,
      )

      const pixels = canvas
        .getContext('2d')
        .getImageData(0, 0, frame.width, frame.height).data
      let coloredSamples = 0
      let darkSamples = 0
      for (let index = 0; index < pixels.length; index += 64) {
        const red = pixels[index]
        const green = pixels[index + 1]
        const blue = pixels[index + 2]
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) {
          coloredSamples += 1
        }
        if (red + green + blue < 240) darkSamples += 1
      }
      assert.ok(coloredSamples > 2_000)
      assert.ok(darkSamples > 100)
    }
  })
})
