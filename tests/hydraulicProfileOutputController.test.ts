import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { afterEach, beforeEach, describe, it } from 'node:test'
import type {
  HydraulicProfileScene,
  IngestNotice,
  NewReportFigure,
} from '../src/core/types'
import { createInitialHydraulicProfileDocument } from '../src/features/hydraulic-profiles/hydraulicProfileDocument'
import { createHydraulicProfileOutputController } from '../src/features/hydraulic-profiles/hydraulicProfileOutputController'
import { parseHydraulicProfileProject } from '../src/features/hydraulic-profiles/hydraulicProfileProjectFile'

function scene(sectionId: string, station: number): HydraulicProfileScene {
  const ground = {
    id: `${sectionId}-ground`,
    sourceIndex: 0,
    distances: [0, 10, 20],
    elevations: [12, 10, 12],
    datasetSlot: 0,
    name: 'Existing Ground',
    kind: 'ground' as const,
  }
  return {
    conditionLabel: 'Existing Conditions',
    section: {
      id: sectionId,
      sourceIndex: station,
      station,
      stationLabel: `${Math.floor(station / 100)}+${String(station % 100).padStart(2, '0')}`,
      summaryZMinimum: 10,
      thalweg: 10,
      sourceSeries: [ground],
      lines: [ground],
      grounds: [ground],
      surfaces: [],
      otherLines: [],
      primaryGround: ground,
      stationReferenceLine: ground,
    },
  }
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      document: {
        createElement: () => createCanvas(1, 1),
      },
    },
  })
})

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

describe('Hydraulic Profiles output controller', () => {
  it('keeps each batch figure linked to its own station draft', () => {
    const scenes = [scene('section-a', 44), scene('section-b', 179)]
    const snapshot = {
      ...createInitialHydraulicProfileDocument(),
      selectedSectionId: 'section-a',
    }
    const figures: NewReportFigure[] = []
    const notices: IngestNotice[] = []
    const controller = createHydraulicProfileOutputController({
      snapshot,
      settings: snapshot.settings,
      scene: scenes[0],
      longitudinalScene: null,
      scenes,
      addFigure: (figure) => figures.push(figure),
      appendNotices: (incoming) => notices.push(...incoming),
    })

    controller.addAllToExport()

    assert.equal(figures.length, 2)
    assert.deepEqual(
      figures.map(({ workspaceDraft }) => parseHydraulicProfileProject(
        workspaceDraft!.source,
      ).selectedSectionId),
      ['section-a', 'section-b'],
    )
    assert.match(notices[0].text, /2 hydraulic cross sections/)
  })

  it('does not create an artifact before the active view is generated', () => {
    const snapshot = createInitialHydraulicProfileDocument()
    const controller = createHydraulicProfileOutputController({
      snapshot,
      settings: snapshot.settings,
      scene: null,
      longitudinalScene: null,
      scenes: [],
      addFigure: () => undefined,
      appendNotices: () => undefined,
    })

    assert.equal(controller.createExportFigure(), null)
  })
})
