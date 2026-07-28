import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateWseAssessmentLines } from '../src/core/assessmentLines'

function squareInput() {
  return {
    x: new Float64Array([0, 1, 1, 0]),
    y: new Float64Array([0, 0, 1, 1]),
    triangles: new Uint32Array([0, 1, 2, 0, 2, 3]),
    wse: new Float32Array([10, 11, 11, 10]),
    depth: new Float32Array([1, 1, 1, 1]),
    dryDepth: 0,
    interval: 0.5,
    feetPerMapUnit: 10,
  }
}

describe('Existing WSE assessment lines', () => {
  it('stitches shared triangle segments into a level-aware polyline', () => {
    const result = generateWseAssessmentLines(squareInput())
    const middle = result.lines.find((line) => line.level === 10.5)

    assert.equal(result.levelCount, 1)
    assert.equal(result.minimumLevel, 10.5)
    assert.equal(result.maximumLevel, 10.5)
    assert.ok(middle)
    assert.equal(middle.points.length, 3)
    assert.ok(
      middle.points.every((point) => Math.abs(point.x - 0.5) < 1e-6),
    )
    assert.ok(Math.abs(middle.lengthFeet - 10) < 1e-6)
  })

  it('supports whole-foot intervals independently from half-foot intervals', () => {
    const input = squareInput()
    input.wse = new Float32Array([10.2, 12.2, 12.2, 10.2])
    input.interval = 1
    const result = generateWseAssessmentLines(input)

    assert.deepEqual(
      [...new Set(result.lines.map((line) => line.level))],
      [11, 12],
    )
    assert.equal(result.levelCount, 2)
  })

  it('does not contour triangles containing dry nodes', () => {
    const input = squareInput()
    input.depth[2] = 0
    const result = generateWseAssessmentLines(input)

    assert.equal(result.lines.length, 0)
    assert.equal(result.levelCount, 0)
  })

  it('keeps disconnected paths as independent reusable lines', () => {
    const result = generateWseAssessmentLines({
      x: new Float64Array([0, 1, 0, 3, 4, 3]),
      y: new Float64Array([0, 0, 1, 0, 0, 1]),
      triangles: new Uint32Array([0, 1, 2, 3, 4, 5]),
      wse: new Float32Array([10, 11, 10, 10, 11, 10]),
      depth: new Float32Array([1, 1, 1, 1, 1, 1]),
      dryDepth: 0,
      interval: 0.5,
      feetPerMapUnit: 1,
    })

    assert.equal(result.lines.length, 2)
    assert.ok(result.lines.every((line) => line.level === 10.5))
  })

  it('rejects invalid intervals and mismatched arrays', () => {
    assert.throws(
      () =>
        generateWseAssessmentLines({
          ...squareInput(),
          interval: 0,
        }),
      /greater than zero/,
    )
    assert.throws(
      () =>
        generateWseAssessmentLines({
          ...squareInput(),
          depth: new Float32Array([1]),
        }),
      /must align/,
    )
  })
})
