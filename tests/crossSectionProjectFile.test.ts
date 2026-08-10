import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseCrossSectionProject,
  serializeCrossSectionProject,
  type CrossSectionProjectState,
} from '../src/features/cross-section/crossSectionProjectFile'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'

function projectState(): CrossSectionProjectState {
  return {
    settings: createDefaultCrossSectionSettings(),
    selectedLine: {
      id: 'manual-1',
      label: 'ROW Section',
      direction: 'a-to-b',
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    },
    selectedAssessmentLineId: '',
    scenarioSelection: {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: { EX: 0, PR: 1 },
    },
    project: { overlays: [] },
  }
}

describe('cross-section project files', () => {
  it('round-trips the figure, line, scenarios, and shared project state', () => {
    const state = projectState()
    state.settings.existingWseLabel = 'Baseline WSE'
    state.settings.legendPosition = 'bottom-left'
    state.settings.yMinimum = 12.5
    assert.deepEqual(
      parseCrossSectionProject(serializeCrossSectionProject(state)),
      state,
    )
  })

  it('migrates version 1 files to shared chart-style defaults', () => {
    const legacy = JSON.parse(serializeCrossSectionProject(projectState()))
    legacy.version = 1
    delete legacy.settings.legendPosition
    delete legacy.settings.xAxisLabel
    delete legacy.settings.seriesOrder

    const parsed = parseCrossSectionProject(JSON.stringify(legacy))

    assert.equal(parsed.settings.legendPosition, 'top-right')
    assert.equal(parsed.settings.xAxisLabel, 'Distance (feet)')
    assert.deepEqual(parsed.settings.seriesOrder, [
      'existing-ground',
      'proposed-ground',
      'existing-wse',
      'proposed-wse',
    ])
  })

  it('rejects malformed section geometry and invalid settings', () => {
    const malformed = JSON.parse(
      serializeCrossSectionProject(projectState()),
    )
    malformed.selectedLine.points = [{ x: 1, y: 2 }]
    assert.throws(
      () => parseCrossSectionProject(JSON.stringify(malformed)),
      /line is malformed/,
    )

    malformed.selectedLine = null
    malformed.settings.sampleSpacing = 0
    assert.throws(
      () => parseCrossSectionProject(JSON.stringify(malformed)),
      /invalid numeric values/,
    )
  })
})
