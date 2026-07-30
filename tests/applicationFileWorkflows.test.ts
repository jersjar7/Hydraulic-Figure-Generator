import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { importHydraulicFiles } from '../src/application/importHydraulicFiles'
import { importOverlayArchives } from '../src/application/importOverlayArchives'
import {
  loadHydraulicProject,
  saveHydraulicProject,
} from '../src/application/hydraulicProjectFiles'
import type {
  ProjectFilePort,
  TextDownload,
} from '../src/application/ports/fileGateways'
import { createWseFigureDocument } from '../src/features/wse-difference/wseFigureDocument'
import { createHydraulicProjectDocument } from '../src/features/project-document/hydraulicProjectDocument'
import {
  createWseProjectSnapshot,
  hydrateWseProject,
} from '../src/features/wse-difference/wseProjectDocument'

function namedFile(name: string, contents = '') {
  return new File([contents], name)
}

describe('application file workflows', () => {
  it('filters hydraulic and overlay inputs before invoking their ports', async () => {
    let hydraulicNames: string[] = []
    let overlayNames: string[] = []

    await importHydraulicFiles(
      [namedFile('existing.h5'), namedFile('notes.txt')],
      {
        ingest: async (files) => {
          hydraulicNames = files.map((file) => file.name)
          return []
        },
      },
    )
    await importOverlayArchives(
      [namedFile('row.zip'), namedFile('readme.md')],
      3,
      {
        read: async (files, startingIndex) => {
          overlayNames = files.map((file) => file.name)
          assert.equal(startingIndex, 3)
          return { overlays: [], notices: [] }
        },
      },
    )

    assert.deepEqual(hydraulicNames, ['existing.h5'])
    assert.deepEqual(overlayNames, ['row.zip'])
  })

  it('saves and loads project text through an injected file port', async () => {
    let downloaded: TextDownload | null = null
    const filePort: ProjectFilePort = {
      readText: (file) => file.text(),
      downloadText: (download) => {
        downloaded = download
      },
    }
    const document = createWseFigureDocument()
    const project = createHydraulicProjectDocument()
    const snapshot = createWseProjectSnapshot({
      ...document,
      ...project,
      settings: { ...document.settings, dryDepth: 0.1 },
      scenarioSelection: {
        baselineId: 'EX',
        comparisonId: 'NA',
        assessmentId: 'EX',
        runByScenario: { EX: 0, NA: 1 },
      },
      assessment: { startStation: 1000 },
    })

    saveHydraulicProject(snapshot, filePort)

    assert.ok(downloaded)
    assert.equal(downloaded.fileName, 'Hydraulic_Figure_Project.hydfig')
    const loaded = await loadHydraulicProject(
      namedFile('project.hydfig', downloaded.contents),
      filePort,
    )
    assert.equal(loaded.settings?.dryDepth, 0.1)
    assert.equal(loaded.scenarioSelection?.comparisonId, 'NA')
    assert.equal(loaded.assessment?.startStation, 1000)
  })

  it('hydrates legacy aliases without mutating the current document', () => {
    const current = createWseFigureDocument()
    const currentProject = createHydraulicProjectDocument()
    const loaded = hydrateWseProject(
      {
        version: 14,
        figure: 'fra-wse-difference',
        settings: {
          contourColor: '#123456',
          showContours: false,
          legendFontSize: 24,
        },
        overlays: [],
        selectedRuns: { existingRun: 2, proposedRun: 3 },
      },
      current,
      currentProject,
    )

    assert.equal(loaded.document.settings.differenceOutlineColor, '#123456')
    assert.equal(loaded.document.settings.showDifferenceOutlines, false)
    assert.equal(loaded.document.settings.elementStyles.diffLegend.fontSize, 24)
    assert.equal(loaded.document.settings.elementStyles.wetDry.fontSize, 23)
    assert.deepEqual(loaded.scenarioSelection.runByScenario, {
      EX: 2,
      PR: 3,
    })
    assert.notEqual(loaded.document, current)
    assert.notEqual(loaded.project, currentProject)
    assert.equal(current.settings.differenceOutlineColor, '#111111')
  })
})
