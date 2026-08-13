import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateArchitectureFile } from '../scripts/architecturePolicy'

describe('architecture policy', () => {
  it('accepts a bounded workspace that delegates to feature controllers', () => {
    const violations = evaluateArchitectureFile({
      relativeFile: 'src/features/cross-section/CrossSectionWorkspace.tsx',
      source: [
        "import { useCrossSectionWorkspaceLifecycle } from './useCrossSectionWorkspaceLifecycle'",
        "import { createCrossSectionWorkspaceOutputController } from './crossSectionWorkspaceOutputController'",
        'export function CrossSectionWorkspace() { return null }',
      ].join('\n'),
    })

    assert.deepEqual(violations, [])
  })

  it('rejects outward dependencies and React inside inward layers', () => {
    const core = evaluateArchitectureFile({
      relativeFile: 'src/core/example.ts',
      source: "import { useState } from 'react'\nimport { panel } from '../components/panel'",
    })

    assert.equal(core.length, 2)
    assert.match(core[0], /core must remain independent of React/)
    assert.match(core[1], /core cannot import from components/)
  })

  it('rejects lifecycle and output policy pulled back into workspace roots', () => {
    const cases = [
      {
        relativeFile: 'src/features/cross-section/CrossSectionWorkspace.tsx',
        source: 'createHydraulicProjectInputActions({})',
        message: /Cross-Section lifecycle and output policies/,
      },
      {
        relativeFile: 'src/features/plan-view-results/PlanViewResultWorkspace.tsx',
        source: 'exportPlanViewResult({})',
        message: /Plan-View lifecycle, output, generation, and settings policies/,
      },
      {
        relativeFile: 'src/features/wse-difference/WseDifferenceWorkspace.tsx',
        source: 'useAssessmentMapLayers({})',
        message: /WSE lifecycle, assessment, interactions, output, and settings policies/,
      },
    ]

    for (const fixture of cases) {
      assert.match(
        evaluateArchitectureFile(fixture).join('\n'),
        fixture.message,
      )
    }
  })

  it('enforces the hardened ceiling assigned to each workspace', () => {
    const violations = evaluateArchitectureFile({
      relativeFile: 'src/features/hydraulic-profiles/HydraulicProfilesWorkspace.tsx',
      source: Array.from({ length: 301 }, () => '// composition').join('\n'),
    })

    assert.match(violations.join('\n'), /300-line composition ceiling/)
  })

  it('requires future feature workspaces to declare a reviewed ceiling', () => {
    const violations = evaluateArchitectureFile({
      relativeFile: 'src/features/new-figure/NewFigureWorkspace.tsx',
      source: 'export function NewFigureWorkspace() { return null }',
    })

    assert.match(
      violations.join('\n'),
      /feature workspaces must declare an explicit composition ceiling/,
    )
  })

  it('keeps global project commands out of figure workspaces', () => {
    const violations = evaluateArchitectureFile({
      relativeFile: 'src/features/example/ExampleWorkspace.tsx',
      source: "import { ProjectCommandBar } from '../project-lifecycle/ProjectCommandBar'",
    })

    assert.match(violations.join('\n'), /global header navigation belongs to App/)
  })
})
