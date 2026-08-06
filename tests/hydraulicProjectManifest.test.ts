import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  HYDRAULIC_PROJECT_SCHEMA,
  HYDRAULIC_PROJECT_VERSION,
  parseHydraulicProjectManifest,
  serializeHydraulicProjectManifest,
  type HydraulicProjectManifest,
} from '../src/core/projectFiles/hydraulicProjectManifest'

function manifest(): HydraulicProjectManifest {
  return {
    schema: HYDRAULIC_PROJECT_SCHEMA,
    version: HYDRAULIC_PROJECT_VERSION,
    projectName: 'Site 6 FRA',
    createdAt: '2026-08-06T08:00:00.000Z',
    updatedAt: '2026-08-06T08:00:00.000Z',
    activeWorkspaceId: 'hydraulic-profiles-sections',
    workspaces: {
      'hydraulic-profiles-sections': {
        documentPath: 'workspaces/hydraulic-profiles.hydfig.json',
        inputPaths: {
          summaryTable: 'inputs/profiles/summary-table.txt',
        },
      },
    },
  }
}

describe('hydraulic project manifest', () => {
  it('round-trips a versioned project index', () => {
    const value = manifest()
    assert.deepEqual(
      parseHydraulicProjectManifest(serializeHydraulicProjectManifest(value)),
      value,
    )
  })

  it('rejects unsupported schemas and unsafe project paths', () => {
    assert.throws(
      () => parseHydraulicProjectManifest(JSON.stringify({ ...manifest(), schema: 'other' })),
      /not a Hydraulic Figure Generator project/,
    )
    const unsafe = manifest()
    unsafe.workspaces['hydraulic-profiles-sections'].documentPath = '../outside.json'
    assert.throws(
      () => parseHydraulicProjectManifest(JSON.stringify(unsafe)),
      /manifest is malformed/,
    )
  })
})
