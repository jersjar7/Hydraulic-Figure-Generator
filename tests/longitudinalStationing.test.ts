import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatLongitudinalAxisStation,
  resolveLongitudinalStationing,
} from '../src/core/hydraulic-profiles/longitudinalStationing'
import {
  layoutLongitudinalStationLabels,
  positionLongitudinalStationLabel,
} from '../src/features/chart-tools/longitudinalStationLabels'

describe('longitudinal stationing', () => {
  it('offsets relative Summary stations from an engineer-defined start', () => {
    const result = resolveLongitudinalStationing({
      rows: [
        { reach: 'Creek', station: 70, zMinimum: 40 },
        { reach: 'Creek', station: 219, zMinimum: 38 },
      ],
      range: { minimum: 0, maximum: 300 },
      initialStation: 1000,
    })

    assert.equal(result.stationStart, 1000)
    assert.deepEqual(result.markers, [
      { id: 'summary-station-0', station: 70, label: '10+70' },
      { id: 'summary-station-1', station: 219, label: '12+19' },
    ])
    assert.equal(formatLongitudinalAxisStation(0, result.stationStart), '10+00')
  })

  it('maps absolute Summary stationing back to profile distance', () => {
    const result = resolveLongitudinalStationing({
      rows: [
        { reach: 'Creek', station: 1070, zMinimum: 40 },
        { reach: 'Creek', station: 1219, zMinimum: 38 },
      ],
      range: { minimum: 0, maximum: 300 },
      initialStation: 1000,
    })

    assert.deepEqual(result.markers, [
      { id: 'summary-station-0', station: 70, label: '10+70' },
      { id: 'summary-station-1', station: 219, label: '12+19' },
    ])
  })

  it('uses additional top and bottom lanes to prevent label overlap', () => {
    const layouts = layoutLongitudinalStationLabels(
      [0, 1, 2, 3, 4].map((index) => ({
        id: String(index),
        anchorX: 100 + index * 4,
        width: 52,
        height: 24,
      })),
      {
        minimumX: 0,
        maximumX: 300,
        placement: 'auto',
        avoidOverlap: true,
        stagger: true,
      },
    )

    for (const layout of layouts) {
      const overlaps = layouts.filter((other) =>
        other.id !== layout.id
        && other.side === layout.side
        && other.lane === layout.lane
        && other.left < layout.left + layout.width
        && other.left + other.width > layout.left)
      assert.equal(overlaps.length, 0)
    }
    assert.ok(layouts.some(({ lane }) => lane > 0))
    assert.notEqual(layouts[0].left, layouts[1].left)
  })

  it('moves one station label without changing the other saved positions', () => {
    const source = {
      first: { offsetX: 4, offsetY: 8 },
      second: { offsetX: 12, offsetY: 16 },
    }

    const positioned = positionLongitudinalStationLabel(
      source,
      'first',
      { offsetX: 40, offsetY: -20 },
    )

    assert.deepEqual(positioned, {
      first: { offsetX: 40, offsetY: -20 },
      second: { offsetX: 12, offsetY: 16 },
    })
    assert.deepEqual(source.first, { offsetX: 4, offsetY: 8 })
  })
})
