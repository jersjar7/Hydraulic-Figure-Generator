import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseWorkspaceSessionProject,
  serializeWorkspaceSessionProject,
  type WorkspaceSessionProjectState,
} from '../src/features/project-lifecycle/workspaceSessionProjectFile'

const session: WorkspaceSessionProjectState = {
  drafts: [{
    workspaceId: 'wse-difference',
    schemaVersion: 14,
    source: '{"title":"Edited WSE"}',
  }],
  reportFigureEditTargets: { 'wse-difference': 'figure-7' },
  hydraulicInputs: [{
    scenarioKey: 'EX',
    scenarioLabel: 'Existing',
    geometryFileName: 'EX-Geo.h5',
    datasetFileName: 'EX-Datasets.h5',
  }],
}

describe('workspace session project files', () => {
  it('round-trips drafts, edit relationships, and local input references', () => {
    assert.deepEqual(
      parseWorkspaceSessionProject(serializeWorkspaceSessionProject(session)),
      session,
    )
  })

  it('rejects duplicate drafts and malformed input references', () => {
    const duplicate = JSON.parse(serializeWorkspaceSessionProject(session))
    duplicate.drafts.push(duplicate.drafts[0])
    assert.throws(
      () => parseWorkspaceSessionProject(JSON.stringify(duplicate)),
      /unique workspace IDs/,
    )

    const malformed = JSON.parse(serializeWorkspaceSessionProject(session))
    malformed.hydraulicInputs[0].geometryFileName = 42
    assert.throws(
      () => parseWorkspaceSessionProject(JSON.stringify(malformed)),
      /hydraulic input reference is malformed/,
    )
  })
})
