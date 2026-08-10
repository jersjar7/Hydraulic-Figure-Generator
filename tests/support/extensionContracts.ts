import assert from 'node:assert/strict'
import type { ProjectWorkflowModule } from '../../src/components/project-data/projectWorkflowModule'
import type { FigureRenderLayer } from '../../src/core/map/renderPipeline'
import type { FigureModule } from '../../src/features/figures/figureModule'
import type { FigureSettingsSectionModule } from '../../src/features/figures/settingsSectionModule'
import type { EditorToolModule } from '../../src/features/tools/editorToolModule'
import type { WorkspaceDraftModule } from '../../src/features/figures/workspaceDraftModule'
import { createWorkspaceDraftSnapshot } from '../../src/features/figures/workspaceDraftRepository'
import { assertFigureToolSupportContract } from '../../src/features/tools/figureToolCapability'

function assertNonEmpty(value: string, field: string) {
  assert.ok(value.trim(), `${field} must not be empty`)
}

function assertUnique(kind: string, values: readonly string[]) {
  assert.equal(
    new Set(values).size,
    values.length,
    `${kind} identifiers must be unique`,
  )
}

export function assertFigureModuleContract<
  Settings,
  Scene,
  BuildRequest,
  RenderRequest,
  SectionKey extends string,
>(
  figure: FigureModule<
    Settings,
    Scene,
    BuildRequest,
    RenderRequest,
    SectionKey
  >,
) {
  assertNonEmpty(figure.id, 'Figure id')
  assertNonEmpty(figure.label, 'Figure label')
  assertNonEmpty(figure.workspaceLabel, 'Workspace label')
  assertNonEmpty(figure.description, 'Figure description')
  assert.ok(
    figure.editor.projectFileExtension.startsWith('.'),
    'Project file extension must start with a period',
  )
  assert.ok(
    figure.editor.inputs.length > 0,
    'A figure must declare at least one input capability',
  )
  assertUnique(
    'Figure settings section',
    figure.editor.settingsSections.map((section) => section.key),
  )
  assertUnique('Figure input capability', figure.editor.inputs)
  assertFigureToolSupportContract(figure.editor)
  assertUnique(
    'Required scenario role',
    figure.editor.requiredScenarioRoles,
  )
  const optionalRoles = new Set(figure.editor.optionalScenarioRoles)
  for (const role of figure.editor.requiredScenarioRoles) {
    assert.ok(
      !optionalRoles.has(role),
      `Scenario role ${role} cannot be both required and optional`,
    )
  }
  assert.equal(typeof figure.createDefaultSettings, 'function')
  assert.equal(typeof figure.canGenerate, 'function')
  assert.equal(typeof figure.buildScene, 'function')
  assert.equal(typeof figure.render, 'function')
  assert.equal(typeof figure.exportFileName, 'function')
}

type RegisteredWorkspace = {
  id: string
  figure: {
    id: string
    editor: { supportedTools: readonly { id: string }[] }
  }
  supportedTools: readonly { id: string }[]
  draft: {
    workspaceId: string
    load: unknown
  }
  Workspace: unknown
  capabilities: {
    folderDraft: unknown
    editableExport: unknown
    inputRecovery: unknown
    draftCompatibility: {
      mode: unknown
      oldestVersion?: unknown
    }
  }
}

export function assertWorkspaceRegistryContract(
  workspaces: readonly RegisteredWorkspace[],
) {
  assert.ok(workspaces.length > 0, 'At least one workspace is required')
  assertUnique(
    'Workspace',
    workspaces.map((workspace) => workspace.id),
  )
  for (const workspace of workspaces) {
    assert.equal(
      workspace.id,
      workspace.figure.id,
      `Workspace ${workspace.id} must use its figure module id`,
    )
    assert.deepEqual(
      workspace.supportedTools.map((tool) => tool.id),
      workspace.figure.editor.supportedTools.map((tool) => tool.id),
      `Workspace ${workspace.id} must expose its figure tool manifest`,
    )
    assert.ok(workspace.Workspace, `Workspace ${workspace.id} needs a component`)
    assert.equal(
      workspace.id,
      workspace.draft.workspaceId,
      `Workspace ${workspace.id} must use a matching draft module id`,
    )
    assert.equal(typeof workspace.draft.load, 'function')
    assert.equal(
      workspace.capabilities.folderDraft,
      true,
      `Workspace ${workspace.id} must participate in folder draft persistence`,
    )
    assert.equal(
      workspace.capabilities.editableExport,
      true,
      `Workspace ${workspace.id} must support editable Export Collection figures`,
    )
    assert.ok(
      workspace.capabilities.inputRecovery === 'portable' ||
      workspace.capabilities.inputRecovery === 'reselect-hydraulic-files',
      `Workspace ${workspace.id} needs an input-recovery policy`,
    )
    const compatibility = workspace.capabilities.draftCompatibility
    assert.ok(
      compatibility.mode === 'current-only' ||
      compatibility.mode === 'migrates-legacy',
      `Workspace ${workspace.id} needs a draft-compatibility policy`,
    )
    if (compatibility.mode === 'migrates-legacy') {
      assert.ok(
        Number.isInteger(compatibility.oldestVersion) &&
        Number(compatibility.oldestVersion) > 0,
        `Workspace ${workspace.id} needs a positive oldest draft version`,
      )
    }
  }
}

export function assertWorkspaceDraftContract(
  module: WorkspaceDraftModule<string, unknown>,
  workspaceId: string,
) {
  assert.equal(module.workspaceId, workspaceId)
  assert.ok(
    Number.isInteger(module.schemaVersion) && module.schemaVersion > 0,
    `Workspace ${workspaceId} needs a positive draft schema version`,
  )
  assert.equal(typeof module.createInitialDraft, 'function')
  assert.equal(typeof module.serializeDraft, 'function')
  assert.equal(typeof module.parseDraft, 'function')
  const snapshot = createWorkspaceDraftSnapshot(
    module,
    module.createInitialDraft(),
  )
  assert.equal(snapshot.workspaceId, workspaceId)
  assert.equal(snapshot.schemaVersion, module.schemaVersion)
  assert.doesNotThrow(() => module.parseDraft(snapshot.source))
}

export function assertEditorToolContract<Tool extends EditorToolModule>(
  tools: readonly Tool[],
) {
  assert.ok(tools.length > 0, 'At least one editor tool is required')
  assertUnique(
    'Editor tool',
    tools.map((tool) => tool.id),
  )
  for (const tool of tools) {
    assertNonEmpty(tool.id, 'Editor tool id')
    assertNonEmpty(tool.label, `Editor tool ${tool.id} label`)
    assert.ok(tool.icon, `Editor tool ${tool.id} needs an icon`)
    assert.equal(typeof tool.requiresScene, 'boolean')
  }
}

export function assertSettingsSectionContract<
  Key extends string,
  Context,
>(
  sections: readonly FigureSettingsSectionModule<Key, Context>[],
) {
  assert.ok(sections.length > 0, 'At least one settings section is required')
  assertUnique(
    'Settings section',
    sections.map((section) => section.key),
  )
  for (const section of sections) {
    assertNonEmpty(section.label, `Settings section ${section.key} label`)
    assertNonEmpty(section.title, `Settings section ${section.key} title`)
    assert.equal(typeof section.component, 'function')
  }
}

export function assertProjectWorkflowContract<Context>(
  modules: readonly ProjectWorkflowModule<Context>[],
) {
  assert.ok(modules.length > 0, 'At least one project workflow is required')
  assertUnique(
    'Project workflow',
    modules.map((module) => module.key),
  )
  for (const module of modules) {
    assertNonEmpty(module.label, `Project workflow ${module.key} label`)
    assertNonEmpty(module.title, `Project workflow ${module.key} title`)
    assert.equal(typeof module.status, 'function')
    assert.equal(typeof module.render, 'function')
  }
}

export function assertRenderLayerContract<Context>(
  layers: readonly FigureRenderLayer<Context>[],
) {
  assert.ok(layers.length > 0, 'At least one render layer is required')
  assertUnique(
    'Render layer',
    layers.map((layer) => layer.id),
  )
  for (const layer of layers) {
    assertNonEmpty(layer.id, 'Render layer id')
    assert.equal(typeof layer.render, 'function')
  }
}
