import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CROSS_SECTION_FIGURE_ID,
  HYDRAULIC_PROFILES_FIGURE_ID,
  PLAN_VIEW_RESULTS_FIGURE_ID,
  WSE_DIFFERENCE_FIGURE_ID,
} from '../src/core/figureIds'
import { FIGURE_WORKSPACES } from '../src/features/figures/workspaceRegistry'
import {
  assertFigureToolSupportContract,
  FIGURE_TOOL_CAPABILITIES,
  hasFigureTool,
  type FigureToolEditorContract,
} from '../src/features/tools/figureToolCapability'

describe('figure tool capability registry', () => {
  it('publishes unique stable tool ids and validates every workspace manifest', () => {
    assert.equal(
      new Set(FIGURE_TOOL_CAPABILITIES.map((tool) => tool.id)).size,
      FIGURE_TOOL_CAPABILITIES.length,
    )
    for (const workspace of FIGURE_WORKSPACES) {
      assert.doesNotThrow(() =>
        assertFigureToolSupportContract(workspace.figure.editor),
      )
      assert.deepEqual(
        workspace.supportedTools,
        workspace.figure.editor.supportedTools,
      )
    }
    assert.deepEqual(
      FIGURE_WORKSPACES.map((workspace) => [
        workspace.id,
        workspace.supportedTools.map((tool) => tool.id),
      ]),
      [
        [
          WSE_DIFFERENCE_FIGURE_ID,
          [
            'hydraulic-models',
            'map-overlays',
            'assessment-lines',
            'map-cartography',
            'frame-view',
            'figure-elements',
            'centerline-stationing',
            'annotations',
            'single-figure-export',
          ],
        ],
        [
          CROSS_SECTION_FIGURE_ID,
          [
            'hydraulic-models',
            'map-overlays',
            'assessment-lines',
            'chart-line-styles',
            'chart-axes',
            'single-figure-export',
          ],
        ],
        [
          PLAN_VIEW_RESULTS_FIGURE_ID,
          [
            'hydraulic-models',
            'map-overlays',
            'map-cartography',
            'frame-view',
            'figure-elements',
            'centerline-stationing',
            'annotations',
            'single-figure-export',
            'batch-figure-generation',
            'figure-document-export',
          ],
        ],
        [
          HYDRAULIC_PROFILES_FIGURE_ID,
          [
            'chart-line-styles',
            'chart-axes',
            'single-figure-export',
            'batch-figure-generation',
          ],
        ],
      ],
    )
  })

  it('derives compatibility flags from supported tools', () => {
    const wse = FIGURE_WORKSPACES[0].figure.editor
    const crossSection = FIGURE_WORKSPACES[1].figure.editor
    assert.equal(hasFigureTool(wse.supportedTools, 'annotations'), true)
    assert.equal(wse.annotations, true)
    assert.equal(
      hasFigureTool(crossSection.supportedTools, 'annotations'),
      false,
    )
    assert.equal(crossSection.annotations, false)
  })

  it('rejects incomplete settings and interaction bindings', () => {
    const missingSettings = {
      inputs: [],
      settingsSections: [{ key: 'frame' }],
      supportedTools: [{
        id: 'frame-view',
        bindings: {
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      }],
    } as FigureToolEditorContract<'frame'>
    assert.throws(
      () => assertFigureToolSupportContract(missingSettings),
      /requires a settings binding/,
    )

    const weakInteraction = {
      inputs: [],
      settingsSections: [{ key: 'annotations' }],
      supportedTools: [{
        id: 'annotations',
        bindings: {
          settingsSection: 'annotations',
          state: 'figure-settings',
          render: ['figure'],
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      }],
    } as FigureToolEditorContract<'annotations'>
    assert.throws(
      () => assertFigureToolSupportContract(weakInteraction),
      /requires canvas interaction/,
    )
  })

  it('rejects duplicate tool declarations and missing input workflows', () => {
    const duplicate = {
      inputs: ['hydraulic-models'],
      settingsSections: [],
      supportedTools: [
        {
          id: 'hydraulic-models',
          bindings: {
            state: 'workspace-state',
            persistence: 'workspace-draft',
            interaction: 'panel',
          },
        },
        {
          id: 'hydraulic-models',
          bindings: {
            state: 'workspace-state',
            persistence: 'workspace-draft',
            interaction: 'panel',
          },
        },
      ],
    } as FigureToolEditorContract
    assert.throws(
      () => assertFigureToolSupportContract(duplicate),
      /Duplicate supported figure tool/,
    )

    const missingInput = {
      inputs: [],
      settingsSections: [],
      supportedTools: [{
        id: 'hydraulic-models',
        bindings: {
          state: 'workspace-state',
          persistence: 'workspace-draft',
          interaction: 'panel',
        },
      }],
    } as FigureToolEditorContract
    assert.throws(
      () => assertFigureToolSupportContract(missingInput),
      /requires input capability hydraulic-models/,
    )
  })
})
