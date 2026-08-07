import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'
import { FIGURE_WORKSPACES } from '../src/features/figures/workspaceRegistry'

const legacyDraftSources: Record<string, string> = {
  'fra-wse-difference': JSON.stringify({
    version: 1,
    figure: 'fra-wse-difference',
  }),
  'plan-view-hydraulic-results': JSON.stringify({
    version: 1,
    figureId: 'plan-view-hydraulic-results',
    settings: createDefaultPlanViewResultSettings(),
    scenarioSelection: {
      baselineId: 'EX',
      comparisonId: 'PR',
      assessmentId: 'EX',
      runByScenario: {},
    },
    project: { overlays: [] },
  }),
  'hydraulic-profiles-sections': JSON.stringify({
    version: 1,
    figureId: 'hydraulic-profiles-sections',
    conditionLabel: 'Existing Conditions',
    eventNames: ['2-year'],
    summaryText: '',
    profileText: '',
    selectedSectionId: '',
    datasetMapping: { groundSlot: 0, surfaceSlots: [1] },
    settings: createDefaultHydraulicProfileSettings(),
  }),
}

describe('registered workspace draft compatibility', () => {
  it('parses a declared oldest-version fixture for every migrating workspace', async () => {
    for (const workspace of FIGURE_WORKSPACES) {
      const compatibility = workspace.capabilities.draftCompatibility
      const source = legacyDraftSources[workspace.id]
      if (compatibility.mode === 'current-only') {
        assert.equal(
          source,
          undefined,
          `${workspace.id} declares current-only compatibility but has a legacy fixture`,
        )
        continue
      }

      assert.ok(source, `${workspace.id} needs a legacy migration fixture`)
      assert.equal(JSON.parse(source).version, compatibility.oldestVersion)
      const module = await workspace.draft.load()
      assert.doesNotThrow(() => module.parseDraft(source))
      assert.ok(module.schemaVersion > compatibility.oldestVersion)
    }
  })

  it('does not leave an unregistered legacy fixture behind', () => {
    assert.deepEqual(
      Object.keys(legacyDraftSources).sort(),
      FIGURE_WORKSPACES
        .filter(({ capabilities }) =>
          capabilities.draftCompatibility.mode === 'migrates-legacy',
        )
        .map(({ id }) => id)
        .sort(),
    )
  })
})
