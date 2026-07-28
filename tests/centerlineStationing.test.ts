import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  extractCenterlineCandidates,
  formatStation,
  generateCenterlineStationTicks,
  stationAssessmentLines,
} from '../src/core/centerlineStationing'
import type {
  CenterlineCandidate,
  MapCoordinate,
  MapOverlay,
  WseAssessmentLine,
} from '../src/core/types'

function centerline(): CenterlineCandidate {
  return {
    id: 'centerline:0:0',
    overlayId: 'centerline',
    overlayName: 'Centerline',
    featureIndex: 0,
    partIndex: 0,
    modelPoints: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    mapPoints: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    lengthFeet: 100,
  }
}

function line(
  id: string,
  modelPoints: MapCoordinate[],
  lengthFeet = 20,
): WseAssessmentLine {
  return {
    id,
    source: 'existing-wse',
    level: 50,
    modelPoints,
    points: modelPoints.map((point) => ({ ...point })),
    lengthFeet,
  }
}

describe('assessment-line centerline stationing', () => {
  it('stations a single crossing from downstream endpoint A', () => {
    const result = stationAssessmentLines(
      [line('single', [{ x: 25, y: -10 }, { x: 25, y: 10 }])],
      centerline(),
      'a-to-b',
      1_000,
    )
    const item = result.items[0]

    assert.equal(item.status, 'included')
    assert.equal(item.intersections.length, 1)
    assert.equal(item.selectedIntersection?.stationFeet, 1_025)
    assert.equal(formatStation(item.selectedIntersection?.stationFeet ?? 0), '10+25')
  })

  it('reverses chainage when endpoint B is downstream', () => {
    const result = stationAssessmentLines(
      [line('single', [{ x: 25, y: -10 }, { x: 25, y: 10 }])],
      centerline(),
      'b-to-a',
      1_000,
    )

    assert.equal(result.items[0].selectedIntersection?.stationFeet, 1_075)
    assert.equal(formatStation(1_075), '10+75')
    assert.equal(formatStation(1_070.5, 1), '10+70.5')
  })

  it('excludes paths without a centerline intersection', () => {
    const result = stationAssessmentLines(
      [line('none', [{ x: 25, y: 5 }, { x: 25, y: 10 }], 5)],
      centerline(),
      'a-to-b',
      0,
    )

    assert.equal(result.excludedCount, 1)
    assert.equal(result.items[0].status, 'excluded')
    assert.match(result.items[0].reason, /Does not intersect/)
    assert.equal(result.items[0].warnings.length, 1)
  })

  it('does not flag disjoint collinear segments as overlaps', () => {
    const result = stationAssessmentLines(
      [line('disjoint', [{ x: 120, y: 0 }, { x: 140, y: 0 }])],
      centerline(),
      'a-to-b',
      0,
    )

    assert.equal(result.items[0].status, 'excluded')
    assert.match(result.items[0].reason, /Does not intersect/)
  })

  it('allows a collinear overlap to be explicitly excluded', () => {
    const overlapping = line('overlap', [
      { x: 20, y: 0 },
      { x: 40, y: 0 },
    ])
    const reviewed = stationAssessmentLines(
      [overlapping],
      centerline(),
      'a-to-b',
      0,
    )
    assert.equal(reviewed.items[0].status, 'review')

    const excluded = stationAssessmentLines(
      [overlapping],
      centerline(),
      'a-to-b',
      0,
      { overlap: { included: false } },
    )
    assert.equal(excluded.items[0].status, 'excluded')
    assert.match(excluded.items[0].reason, /Excluded by the user/)
  })

  it('requires a user choice for multiple intersections', () => {
    const multiple = line('multiple', [
      { x: 20, y: -10 },
      { x: 20, y: 10 },
      { x: 80, y: 10 },
      { x: 80, y: -10 },
    ])
    const unresolved = stationAssessmentLines(
      [multiple],
      centerline(),
      'a-to-b',
      0,
    )
    const resolved = stationAssessmentLines(
      [multiple],
      centerline(),
      'a-to-b',
      0,
      { multiple: { intersectionIndex: 1, included: true } },
    )

    assert.equal(unresolved.items[0].status, 'review')
    assert.equal(unresolved.items[0].intersections.length, 2)
    assert.equal(resolved.items[0].status, 'included')
    assert.equal(resolved.items[0].selectedIntersection?.stationFeet, 80)
  })

  it('honors an explicit exclusion without losing its station', () => {
    const result = stationAssessmentLines(
      [line('excluded', [{ x: 30, y: -10 }, { x: 30, y: 10 }])],
      centerline(),
      'a-to-b',
      0,
      { excluded: { included: false } },
    )

    assert.equal(result.items[0].status, 'excluded')
    assert.equal(result.items[0].selectedIntersection?.stationFeet, 30)
    assert.match(result.items[0].reason, /Excluded by the user/)
  })

  it('extracts each line part from an overlay in the model CRS', () => {
    const overlay: MapOverlay = {
      id: 'overlay',
      name: 'Centerline',
      color: '#000000',
      width: 2,
      visible: true,
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: null,
            geometry: {
              type: 'MultiLineString',
              coordinates: [
                [
                  [0, 0],
                  [0.001, 0],
                ],
                [
                  [0.001, 0],
                  [0.002, 0],
                ],
              ],
            },
          },
        ],
      },
    }

    const candidates = extractCenterlineCandidates(
      [overlay],
      'EPSG:3857',
    )

    assert.equal(candidates.length, 2)
    assert.ok(candidates.every((candidate) => candidate.lengthFeet > 100))
    assert.equal(candidates[0].overlayId, overlay.id)
  })

  it('formats rounded stations without a 0+100 remainder', () => {
    assert.equal(formatStation(99.6), '1+00')
    assert.equal(formatStation(1070), '10+70')
    assert.equal(formatStation(-99.6), '-1+00')
  })

  it('generates independent minor, major, and label schedules', () => {
    const ticks = generateCenterlineStationTicks(
      centerline(),
      'a-to-b',
      1_000,
      {
        minorInterval: 25,
        majorInterval: 50,
        labelInterval: 100,
      },
    )

    assert.deepEqual(
      ticks.map((tick) => tick.stationFeet),
      [1_000, 1_025, 1_050, 1_075, 1_100],
    )
    assert.deepEqual(
      ticks.filter((tick) => tick.major).map((tick) => tick.stationFeet),
      [1_000, 1_050, 1_100],
    )
    assert.deepEqual(
      ticks.filter((tick) => tick.label).map((tick) => tick.stationFeet),
      [1_000, 1_100],
    )
  })

  it('clips station marks to a requested station range', () => {
    const ticks = generateCenterlineStationTicks(
      centerline(),
      'a-to-b',
      1_000,
      {
        minorInterval: 10,
        majorInterval: 20,
        labelInterval: 20,
        rangeStart: 1_025,
        rangeEnd: 1_075,
      },
    )

    assert.deepEqual(
      ticks.map((tick) => tick.stationFeet),
      [1_030, 1_040, 1_050, 1_060, 1_070],
    )
  })

  it('places increasing stations in the reverse physical direction from B', () => {
    const ticks = generateCenterlineStationTicks(
      centerline(),
      'b-to-a',
      1_000,
      {
        minorInterval: 25,
        majorInterval: 50,
        labelInterval: 100,
      },
    )
    const start = ticks.find((tick) => tick.stationFeet === 1_000)
    const end = ticks.find((tick) => tick.stationFeet === 1_100)

    assert.equal(start?.mapPoint.x, 100)
    assert.equal(end?.mapPoint.x, 0)
    assert.ok((start?.mapTangent.x ?? 0) < 0)
  })

  it('rejects zero intervals before generating marks', () => {
    assert.throws(
      () =>
        generateCenterlineStationTicks(centerline(), 'a-to-b', 0, {
          minorInterval: 0,
          majorInterval: 100,
          labelInterval: 100,
        }),
      /Minor tick interval/,
    )
  })
})
