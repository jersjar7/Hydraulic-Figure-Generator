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
        showAssessmentLabels: true,
        assessmentLabelColor: '#172b3a',
        assessmentLabelFontSize: 18,
        assessmentLabelOffset: 28,
        assessmentLabelSide: 'alternate',
        basemapOpacity: 0.5,
        centerlineStationing: {
          visible: true,
          showMinorTicks: true,
          showMajorTicks: true,
          showLabels: true,
          minorInterval: 25,
          majorInterval: 100,
          labelInterval: 100,
          rangeStart: 1000,
          rangeEnd: 1500,
          minorTickLength: 10,
          majorTickLength: 18,
          minorLineWidth: 1.25,
          majorLineWidth: 2,
          tickSide: 'both',
          tickColor: '#d92d20',
          labelColor: '#172b3a',
          labelFontSize: 18,
          labelOffset: 25,
          labelSide: 'auto',
          labelOrientation: 'horizontal',
          labelHalo: true,
          prefix: 'STA ',
          decimalPlaces: 0,
          showEndpoints: true,
          showDirectionArrow: true,
          overrides: {
            'station:1100.000000': {
              visible: true,
              labelPoint: { x: 10, y: 20 },
              text: 'Bridge',
            },
          },
        },
      },
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'NA',
        assessmentId: 'EX',
        runByScenario: { EX: 1, NA: 0 },
        labels: { EX: 'Existing', NA: 'Natural' },
      },
      assessment: {
        centerlineId: 'overlay-1:0:0',
        direction: 'b-to-a',
        startStation: 1000,
        overrides: {
          'existing-wse:52:0': {
            included: true,
            intersectionIndex: 1,
            labelVisible: true,
            labelPoint: { x: 123, y: 456 },
          },
          'existing-wse:53:0': {
            included: false,
            labelVisible: false,
          },
        },
      },
    })

    const loaded = parseHydraulicFigureProject(JSON.stringify(saved))

    assert.equal(loaded.version, PROJECT_FILE_VERSION)
    assert.equal(loaded.figure, 'fra-wse-difference')
    assert.equal(saved.activeFigure, 'fra-wse-difference')
    assert.deepEqual(
      loaded.settings,
      saved.figures['fra-wse-difference'].settings,
    )
    assert.deepEqual(
      loaded.scenarioSelection,
      saved.project.scenarioSelection,
    )
    assert.deepEqual(
      loaded.assessment,
      saved.figures['fra-wse-difference'].assessment,
    )
  })

  it('migrates the flat version 13 layout into normalized project state', () => {
    const loaded = parseHydraulicFigureProject(
      JSON.stringify({
        version: 13,
        figure: 'fra-wse-difference',
        settings: { dryDepth: 0.01 },
        scenarioSelection: {
          baselineId: 'EX',
          comparisonId: 'PR',
          assessmentId: 'EX',
          runByScenario: { EX: 1, PR: 2 },
        },
        assessment: {
          centerlineId: 'centerline',
          direction: 'a-to-b',
          startStation: 500,
        },
      }),
    )

    assert.equal(loaded.settings?.dryDepth, 0.01)
    assert.deepEqual(loaded.scenarioSelection?.runByScenario, {
      EX: 1,
      PR: 2,
    })
    assert.equal(loaded.assessment?.startStation, 500)
  })

  it('migrates version 11 Existing and Proposed run selections to scenario roles', () => {
    const loaded = parseHydraulicFigureProject(
      JSON.stringify({
        version: 11,
        figure: 'fra-wse-difference',
        selectedRuns: { existingRun: 2, proposedRun: 3 },
      }),
    )

    assert.deepEqual(loaded.scenarioSelection, {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: { EX: 2, PR: 3 },
    })
  })

  it('migrates version 10 assessment station-label settings to WSE callouts', () => {
    const loaded = parseHydraulicFigureProject(
      JSON.stringify({
        version: 10,
        figure: 'fra-wse-difference',
        settings: {
          showAssessmentStationLabels: false,
          assessmentStationLabelColor: '#224466',
          assessmentStationLabelFontSize: 16,
          assessmentStationLabelOffset: 24,
          assessmentStationLabelSide: 'left',
        },
      }),
    )

    assert.equal(loaded.settings?.showAssessmentLabels, false)
    assert.equal(loaded.settings?.assessmentLabelColor, '#224466')
    assert.equal(loaded.settings?.assessmentLabelFontSize, 16)
    assert.equal(loaded.settings?.assessmentLabelOffset, 24)
    assert.equal(loaded.settings?.assessmentLabelSide, 'left')
    assert.equal('showAssessmentStationLabels' in (loaded.settings ?? {}), false)
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
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: PROJECT_FILE_VERSION,
            activeFigure: 'proposed-cross-section',
            project: {},
            figures: {},
          }),
        ),
      /different figure type/,
    )
  })

  it('rejects unsafe numeric settings and malformed annotation geometry', () => {
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: 13,
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
            version: 13,
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
            version: 13,
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
            version: 13,
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
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: 13,
            figure: 'fra-wse-difference',
            assessment: {
              overrides: {
                'existing-wse:52:0': { labelPoint: { x: 'left', y: 2 } },
              },
            },
          }),
        ),
      /labelPoint.x/,
    )
    assert.throws(
      () =>
        parseHydraulicFigureProject(
          JSON.stringify({
            version: 13,
            figure: 'fra-wse-difference',
            settings: {
              centerlineStationing: { minorInterval: 0 },
            },
          }),
        ),
      /minorInterval/,
    )
  })
})
