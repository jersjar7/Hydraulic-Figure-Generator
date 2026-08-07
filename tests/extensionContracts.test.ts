import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasProjectWorkflowForInput,
  PROJECT_WORKFLOW_MODULES,
} from '../src/components/project-data/projectWorkflowRegistry'
import { WSE_DIFFERENCE_RENDER_LAYERS } from '../src/core/map/wseDifferenceRenderLayers'
import { WSE_ANNOTATION_TOOLS } from '../src/features/wse-difference/annotationTools'
import { FIGURE_WORKSPACES } from '../src/features/figures/workspaceRegistry'
import { WSE_SETTINGS_SECTIONS } from '../src/features/wse-difference/wseSettingsSections'
import {
  assertEditorToolContract,
  assertFigureModuleContract,
  assertProjectWorkflowContract,
  assertRenderLayerContract,
  assertSettingsSectionContract,
  assertWorkspaceDraftContract,
  assertWorkspaceRegistryContract,
} from './support/extensionContracts'

describe('extension contracts', () => {
  it('accepts every registered figure workspace', async () => {
    assertWorkspaceRegistryContract(FIGURE_WORKSPACES)
    for (const workspace of FIGURE_WORKSPACES) {
      assertFigureModuleContract(workspace.figure)
      assertWorkspaceDraftContract(
        await workspace.draft.load(),
        workspace.id,
      )
      for (const input of workspace.figure.editor.inputs) {
        assert.equal(
          hasProjectWorkflowForInput(input),
          true,
          `${workspace.id} input ${input} needs a project workflow`,
        )
      }
    }
  })

  it('accepts the registered editor tools and settings sections', () => {
    assertEditorToolContract(WSE_ANNOTATION_TOOLS)
    assertSettingsSectionContract(WSE_SETTINGS_SECTIONS)
  })

  it('accepts the project workflows and ordered render layers', () => {
    assertProjectWorkflowContract(PROJECT_WORKFLOW_MODULES)
    assertRenderLayerContract(WSE_DIFFERENCE_RENDER_LAYERS)
  })
})
