import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import {
  readFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { HydraulicEngine } from '../src/core/hydraulicEngine'

const fixtureDirectory = join(process.cwd(), 'tests', 'fixtures', 'h5')
const fixtureNames = [
  'Existing-Geometry.h5',
  'Existing-Datasets.h5',
  'Proposed-Geometry.h5',
  'Proposed-Datasets.h5',
]

describe('synthetic SMS H5 contract', () => {
  it('uploads complete scenarios and builds a known WSE difference', async () => {
    const files = await Promise.all(
      fixtureNames.map(async (name) =>
        new File([await readFile(join(fixtureDirectory, name))], name),
      ),
    )
    const engine = new HydraulicEngine()
    const notices = await engine.ingest(
      files as unknown as globalThis.File[],
    )

    assert.deepEqual(
      notices.filter((notice) => notice.level === 'error'),
      [],
    )
    assert.equal(engine.isReady('EX', 'PR'), true)
    const scene = engine.buildWseDifference('EX', 0, 'PR', 0, 0)
    assert.equal(scene.validDifferenceNodes, 4)
    assert.deepEqual(
      Array.from(scene.diff).map((value) => Number(value.toFixed(2))),
      [0.5, -0.1, 0.6, -0.3],
    )
    const crossSection = engine.buildCrossSection(
      'EX',
      0,
      'PR',
      0,
      {
        id: 'synthetic-section',
        label: 'Synthetic section',
        points: [
          {
            x: scene.projected.mx[0],
            y: (scene.projected.my[0] + scene.projected.my[2]) / 2,
          },
          {
            x: scene.projected.mx[1],
            y: (scene.projected.my[1] + scene.projected.my[3]) / 2,
          },
        ],
        direction: 'a-to-b',
      },
      0,
      1,
    )
    assert.ok(crossSection.samples.length >= 25)
    assert.ok(crossSection.baselineAverage.value != null)
    assert.ok(crossSection.comparisonAverage.value != null)
    assert.equal(crossSection.warnings.length, 0)
    engine.reset()
  })
})
