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
        assessmentLineInterval: 0.5,
        assessmentLineColor: '#d92d20',
        assessmentLineWidth: 2,
        showAssessmentLines: true,
        showAssessmentStationLabels: true,
        assessmentStationLabelColor: '#172b3a',
        assessmentStationLabelFontSize: 18,
        assessmentStationLabelOffset: 16,
        assessmentStationLabelSide: 'alternate',
        basemapOpacity: 0.5,
      },
      selectedRuns: { existingRun: 1, proposedRun: 2 },
      assessment: {
        centerlineId: 'overlay-1:0:0',
        direction: 'b-to-a',
        startStation: 1000,
        overrides: {
          'existing-wse:52:0': {
            included: true,
            intersectionIndex: 1,
          },
          'existing-wse:53:0': { included: false },
        },
      },
    })

    const loaded = parseHydraulicFigureProject(JSON.stringify(saved))

    assert.equal(loaded.version, PROJECT_FILE_VERSION)
    assert.equal(loaded.figure, 'fra-wse-difference')
    assert.deepEqual(loaded.settings, saved.settings)
    assert.deepEqual(loaded.selectedRuns, saved.selectedRuns)
    assert.deepEqual(loaded.assessment, saved.assessment)
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
            settings: { assessmentLineInterval: 0 },
          }),
        ),
      /assessmentLineInterval/,
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
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: PROJECT_FILE_VERSION,
            figure: 'fra-wse-difference',
            assessment: {
              overrides: {
                'existing-wse:52:0': { intersectionIndex: -1 },
              },
            },
          }),
        ),
      /intersectionIndex/,
    )
  })
})
