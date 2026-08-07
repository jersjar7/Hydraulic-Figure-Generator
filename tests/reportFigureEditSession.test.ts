import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addReportFigure,
  createReportAssemblyDocument,
  createReportFigure,
  removeReportFigure,
} from '../src/application/report-assembly/reportAssembly'
import {
  linkReportFigureEditTarget,
  pruneReportFigureEditTargets,
  resolveReportFigureEditTarget,
  unlinkReportFigureEditTarget,
} from '../src/application/report-assembly/reportFigureEditSession'

function figure(id: string, workspaceId: string) {
  return createReportFigure({
    workspaceId,
    workspaceLabel: workspaceId,
    title: id,
    caption: id,
    imageDataUrl: 'data:image/png;base64,AA==',
    widthPx: 1200,
    heightPx: 900,
    workspaceDraft: {
      workspaceId,
      schemaVersion: 1,
      source: '{}',
    },
  }, id)
}

describe('report figure edit sessions', () => {
  it('keeps an independent linked export for each workspace', () => {
    const profile = figure('profile-1', 'profiles')
    const map = figure('map-1', 'maps')
    let document = createReportAssemblyDocument()
    document = addReportFigure(document, profile)
    document = addReportFigure(document, map)
    let targets = linkReportFigureEditTarget({}, profile)
    targets = linkReportFigureEditTarget(targets, map)

    assert.equal(resolveReportFigureEditTarget(document, targets, 'profiles'), profile)
    assert.equal(resolveReportFigureEditTarget(document, targets, 'maps'), map)
    assert.deepEqual(unlinkReportFigureEditTarget(targets, 'maps'), {
      profiles: 'profile-1',
    })
  })

  it('prunes links when their exported artifacts are removed', () => {
    const profile = figure('profile-1', 'profiles')
    const map = figure('map-1', 'maps')
    let document = createReportAssemblyDocument()
    document = addReportFigure(document, profile)
    document = addReportFigure(document, map)
    const targets = linkReportFigureEditTarget(
      linkReportFigureEditTarget({}, profile),
      map,
    )

    document = removeReportFigure(document, profile.id)

    assert.deepEqual(pruneReportFigureEditTargets(document, targets), {
      maps: 'map-1',
    })
  })
})
