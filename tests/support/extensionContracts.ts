import assert from 'node:assert/strict'
import type { ProjectWorkflowModule } from '../../src/components/project-data/projectWorkflowModule'
import type { FigureRenderLayer } from '../../src/core/map/renderPipeline'
import type { FigureModule } from '../../src/features/figures/figureModule'
import type { FigureSettingsSectionModule } from '../../src/features/figures/settingsSectionModule'
import type { EditorToolModule } from '../../src/features/tools/editorToolModule'

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
  figure: { id: string }
  Workspace: unknown
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
    assert.ok(workspace.Workspace, `Workspace ${workspace.id} needs a component`)
  }
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
