import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { HydraulicProfileLine } from '../src/core/types'
import { clipHydraulicProfileLineAtGround } from '../src/core/hydraulic-profiles/clipHydraulicProfileLine'

function line(
  id: string,
  kind: HydraulicProfileLine['kind'],
  distances: number[],
  elevations: Array<number | null>,
): HydraulicProfileLine {
  return {
    id,
    sourceIndex: 0,
    datasetSlot: kind === 'ground' ? 0 : 1,
    name: id,
    kind,
    distances,
    elevations,
  }
}

describe('hydraulic profile WSE clipping', () => {
  it('clips an overextended WSE at exact interpolated terrain intersections', () => {
    const ground = line('Ground', 'ground', [0, 5, 10], [10, 0, 10])
    const surface = line('WSE', 'wse', [0, 10], [6, 6])

    const clipped = clipHydraulicProfileLineAtGround(surface, ground)

    assert.equal(clipped.length, 1)
    assert.equal(clipped[0][0].distance, 2)
    assert.equal(clipped[0].at(-1)!.distance, 8)
    assert.ok(clipped[0].every(({ elevation }) => elevation === 6))
  })

  it('does not extend a WSE that stops before reaching the ground', () => {
    const ground = line('Ground', 'ground', [0, 5, 10], [10, 0, 10])
    const surface = line('Short WSE', 'wse', [3, 7], [6, 6])

    const clipped = clipHydraulicProfileLineAtGround(surface, ground)

    assert.equal(clipped.length, 1)
    assert.equal(clipped[0][0].distance, 3)
    assert.equal(clipped[0].at(-1)!.distance, 7)
  })

  it('preserves disconnected wet regions instead of bridging across high ground', () => {
    const ground = line('Ground', 'ground', [0, 2, 4, 6, 8], [10, 0, 10, 0, 10])
    const surface = line('WSE', 'wse', [0, 8], [6, 6])

    const clipped = clipHydraulicProfileLineAtGround(surface, ground)

    assert.equal(clipped.length, 2)
    assert.deepEqual(
      clipped.map((segment) => [segment[0].distance, segment.at(-1)!.distance]),
      [[0.8, 3.2], [4.8, 7.2]],
    )
  })

  it('does not bridge null gaps in the exported WSE series', () => {
    const ground = line('Ground', 'ground', [0, 5, 10], [10, 0, 10])
    const surface = line('Gapped WSE', 'wse', [0, 4, 5, 6, 10], [6, 6, null, 6, 6])

    const clipped = clipHydraulicProfileLineAtGround(surface, ground)

    assert.deepEqual(
      clipped.map((segment) => [segment[0].distance, segment.at(-1)!.distance]),
      [[2, 4], [6, 8]],
    )
  })
})
