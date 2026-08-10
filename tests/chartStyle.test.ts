import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  chartLineDash,
  chartLinePattern,
  chartStyleValidationIssues,
  withChartLinePattern,
} from '../src/core/chartStyle'
import {
  crossSectionChartAxes,
  crossSectionChartSeries,
  moveCrossSectionSeries,
  updateCrossSectionSeries,
} from '../src/features/cross-section/crossSectionChartStyle'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'
import {
  hydraulicProfileChartSeries,
  moveHydraulicProfileSeries,
  updateHydraulicProfileLineVisibility,
} from '../src/features/hydraulic-profiles/hydraulicProfileChartStyle'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'
import type { HydraulicProfileLine } from '../src/core/types'

const line = (slot: number, name: string): HydraulicProfileLine => ({
  id: `line-${slot}`,
  sourceIndex: slot,
  datasetSlot: slot,
  name,
  kind: slot === 0 ? 'ground' : 'wse',
  distances: [0, 10],
  elevations: [20 + slot, 20 + slot],
})

describe('shared chart styling controls', () => {
  it('uses one named line-pattern vocabulary without mutating styles', () => {
    const original = { color: '#123456', width: 2, dash: [] as number[] }
    const dashed = withChartLinePattern(original, 'dash-dot')

    assert.deepEqual(original.dash, [])
    assert.deepEqual(dashed.dash, chartLineDash('dash-dot'))
    assert.equal(chartLinePattern(dashed), 'dash-dot')
  })

  it('updates and orders cross-section series immutably', () => {
    const settings = createDefaultCrossSectionSettings()
    const renamed = updateCrossSectionSeries(settings, 'existing-wse', {
      label: 'Baseline WSE',
      visible: false,
    })
    const moved = moveCrossSectionSeries(renamed, 'proposed-wse', -1)

    assert.equal(settings.existingWseLabel, 'Existing 100-Year WSE')
    assert.equal(renamed.existingWseLabel, 'Baseline WSE')
    assert.equal(renamed.showExistingWse, false)
    assert.equal(crossSectionChartSeries(moved)[2].id, 'proposed-wse')
  })

  it('keeps profile visibility and ordering independent by dataset slot', () => {
    const settings = createDefaultHydraulicProfileSettings()
    const lines = [line(0, 'Ground'), line(2, '500-year'), line(1, '100-year')]
    const hidden = updateHydraulicProfileLineVisibility(settings, 2, false)
    const moved = moveHydraulicProfileSeries(hidden, lines, 1, -1)
    const series = hydraulicProfileChartSeries(moved, lines)

    assert.equal(settings.lineVisibility[2], true)
    assert.deepEqual(series.map((item) => item.id), [1, 0, 2])
    assert.equal(series.at(-1)?.visible, false)
  })

  it('validates shared axes, legend, and line constraints', () => {
    const settings = createDefaultCrossSectionSettings()
    const issues = chartStyleValidationIssues({
      layout: { title: '', orientation: settings.orientation },
      legend: {
        visible: true,
        position: settings.legendPosition,
        backgroundColor: settings.legendBackgroundColor,
        backgroundOpacity: 2,
        borderColor: settings.legendBorderColor,
      },
      axes: {
        ...crossSectionChartAxes(settings),
        yMinimum: 10,
        yMaximum: 9,
      },
      lines: [{ color: '#000000', width: 0, dash: [] }],
    })

    assert.ok(issues.some((issue) => issue.includes('title')))
    assert.ok(issues.some((issue) => issue.includes('opacity')))
    assert.ok(issues.some((issue) => issue.includes('Y maximum')))
    assert.ok(issues.some((issue) => issue.includes('Series 1 width')))
  })
})
