import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createHydraulicFigureProject,
  parseHydraulicFigureProject,
  PROJECT_FILE_VERSION,
} from '../src/core/projectFile'

describe('hydraulic figure project files', () => {
  it('round-trips a current project envelope', () => {
    const saved = createHydraulicFigureProject({
      settings: {
        orientation: 'portrait',
        dryDepth: 0,
        basemapOpacity: 0.5,
      },
      selectedRuns: { existingRun: 1, proposedRun: 2 },
    })

    const loaded = parseHydraulicFigureProject(JSON.stringify(saved))

    assert.equal(loaded.version, PROJECT_FILE_VERSION)
    assert.equal(loaded.figure, 'fra-wse-difference')
    assert.deepEqual(loaded.settings, saved.settings)
    assert.deepEqual(loaded.selectedRuns, saved.selectedRuns)
  })

  it('migrates supported legacy settings and removes marker annotations', () => {
    const loaded = parseHydraulicFigureProject(
      JSON.stringify({
        version: 7,
        figure: 'fra-wse-difference',
        settings: {
          contourColor: '#123456',
          showContours: false,
        },
        annotations: [
          {
            id: 'legacy-marker',
            kind: 'marker',
            points: [{ x: 1, y: 2 }],
          },
          {
            id: 'legacy-text',
            kind: 'text',
            points: [{ x: 1, y: 2 }],
            text: 'Review',
            color: '#111111',
            fillColor: '#ffffff',
            lineWidth: 2,
            fontSize: 18,
            dashed: false,
            background: true,
          },
        ],
      }),
    )

    assert.equal(loaded.settings?.contourColor, '#123456')
    assert.equal(loaded.settings?.showContours, false)
    assert.equal(loaded.annotations?.length, 1)
    assert.equal(loaded.annotations?.[0].id, 'legacy-text')
    assert.equal(loaded.annotations?.[0].rotation, 0)
  })

  it('rejects projects for another figure or a newer schema', () => {
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({ version: 1, figure: 'appendix-h' }),
        ),
      /different figure type/,
    )
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: PROJECT_FILE_VERSION + 1,
            figure: 'fra-wse-difference',
          }),
        ),
      /supports through version/,
    )
  })

  it('rejects unsafe numeric settings and malformed annotation geometry', () => {
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: PROJECT_FILE_VERSION,
            figure: 'fra-wse-difference',
            settings: { basemapOpacity: 5 },
          }),
        ),
      /basemapOpacity/,
    )
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: PROJECT_FILE_VERSION,
            figure: 'fra-wse-difference',
            annotations: [
              {
                id: 'bad-line',
                kind: 'line',
                points: [{ x: 1, y: 2 }],
              },
            ],
          }),
        ),
      /requires at least 2 points/,
    )
  })
})
