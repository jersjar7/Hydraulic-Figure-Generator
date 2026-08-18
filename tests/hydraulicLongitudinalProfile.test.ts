import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import { buildHydraulicLongitudinalScene } from '../src/core/hydraulic-profiles/buildHydraulicLongitudinalScene'
import {
  hydraulicCrossSectionCulvertPoints,
  hydraulicLongitudinalCulvertPoints,
} from '../src/core/hydraulic-profiles/culvertGeometry'
import type {
  HydraulicCrossSectionCulvert,
  HydraulicProfileLine,
  SmsProfileSeries,
} from '../src/core/types'
import { renderHydraulicLongitudinalDocument } from '../src/features/hydraulic-profiles/hydraulicLongitudinalRenderer'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'

const series: SmsProfileSeries[] = [
  {
    id: 'profile-series-1',
    sourceIndex: 0,
    distances: [0, 50, 100],
    elevations: [50, 48, 46],
  },
  {
    id: 'profile-series-2',
    sourceIndex: 1,
    distances: [0, 50, 100],
    elevations: [52, null, 48],
  },
]

describe('hydraulic longitudinal profiles', () => {
  it('uses engineer-defined line roles and keeps dry SMS gaps', () => {
    const scene = buildHydraulicLongitudinalScene(series, {
      conditionLabel: 'Proposed Conditions',
      configuration: {
        datasetsPerSection: 2,
        stationReferenceSlot: 0,
        definitions: [
          { slot: 0, name: 'Proposed Ground', kind: 'ground' },
          { slot: 1, name: '100-year WSE', kind: 'wse' },
        ],
      },
      summaryRows: [
        { reach: 'Creek', station: 1000, zMinimum: 50 },
        { reach: 'Creek', station: 1050, zMinimum: 48 },
        { reach: 'Creek', station: 1100, zMinimum: 46 },
      ],
      culverts: [],
    })

    assert.ok(scene)
    assert.equal(scene.grounds[0].name, 'Proposed Ground')
    assert.equal(scene.surfaces[0].name, '100-year WSE')
    assert.equal(scene.surfaces[0].elevations[1], null)
    assert.deepEqual(scene.markers.map(({ label }) => label), ['10+00', '10+50', '11+00'])
    assert.equal(scene.stationStart, 1000)
  })

  it('renders lines, markers, and a longitudinal culvert in both frames', () => {
    const scene = buildHydraulicLongitudinalScene(series, {
      conditionLabel: 'Proposed Conditions',
      configuration: {
        datasetsPerSection: 2,
        stationReferenceSlot: 0,
        definitions: [
          { slot: 0, name: 'Proposed Ground', kind: 'ground' },
          { slot: 1, name: '100-year WSE', kind: 'wse' },
        ],
      },
      summaryRows: [{ reach: 'Creek', station: 1050, zMinimum: 48 }],
      culverts: [{
        id: 'culvert-1',
        name: 'Road Culvert',
        leftStation: 42,
        rightStation: 58,
        invertLeft: 46,
        invertRight: 46.5,
        height: 5,
        color: '#111111',
        lineWidth: 2.5,
        dash: [8, 4],
      }],
    })!

    for (const orientation of ['landscape', 'portrait'] as const) {
      const canvas = createCanvas(1, 1)
      const settings = {
        ...createDefaultHydraulicProfileSettings(),
        orientation,
        xGridSpacing: 25,
        yGridSpacing: 2,
      }
      settings.longitudinalStationing.labelPositions = {
        'summary-station-0': { offsetX: 100, offsetY: 80 },
      }
      const labels = renderHydraulicLongitudinalDocument(
        canvas as unknown as HTMLCanvasElement,
        {
          scene,
          settings,
        },
      )
      assert.equal(labels.length, 1)
      assert.ok(labels[0].x > labels[0].anchorX)
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      let nonWhite = 0
      for (let index = 0; index < pixels.length; index += 64) {
        if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) nonWhite += 1
      }
      assert.ok(nonWhite > 500)
    }
  })

  it('builds every supported cross-section culvert and a closed longitudinal box', () => {
    const ground: HydraulicProfileLine = {
      id: 'ground',
      sourceIndex: 0,
      datasetSlot: 0,
      name: 'Ground',
      kind: 'ground',
      distances: [0, 10, 20],
      elevations: [30, 25, 30],
    }
    const base: HydraulicCrossSectionCulvert = {
      sectionId: 'section-1',
      name: 'Culvert',
      kind: 'box',
      scour: 1,
      bed: 2,
      center: null,
      width: 8,
      height: 5,
      span: 8,
      legHeight: 2,
      rise: 4,
      diameter: 6,
      color: '#222222',
      lineWidth: 2,
      dash: [],
    }
    for (const kind of ['box', 'arch', 'circle', 'ellipse'] as const) {
      const points = hydraulicCrossSectionCulvertPoints({ ...base, kind }, ground)
      assert.ok(points.length >= 5)
      assert.deepEqual(points[0], points.at(-1))
    }
    const box = hydraulicLongitudinalCulvertPoints({
      id: 'long-1',
      name: 'Road Culvert',
      leftStation: 40,
      rightStation: 60,
      invertLeft: 45,
      invertRight: 46,
      height: 5,
      color: '#222222',
      lineWidth: 2,
      dash: [],
    })
    assert.deepEqual(box[0], box.at(-1))
  })
})
