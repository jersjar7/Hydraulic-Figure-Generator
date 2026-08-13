import type { WorkspaceInputCapability } from '../../core/contracts/workspace'

export type FigureToolBindingRequirement =
  | 'settings'
  | 'state'
  | 'render'
  | 'persistence'
  | 'interaction'
  | 'export'

export type FigureToolInteractionBinding = 'panel' | 'canvas'
export type FigureToolStateBinding =
  | 'project-document'
  | 'figure-settings'
  | 'workspace-state'
export type FigureToolRenderBinding =
  | 'figure'
  | 'selection-map'
  | 'document'
export type FigureToolPersistenceBinding =
  | 'project-document'
  | 'workspace-draft'
export type FigureToolExportBinding = 'png' | 'report-artifact' | 'word'

type FigureToolDefinition = Readonly<{
  id: string
  label: string
  input?: WorkspaceInputCapability
  requiredBindings: readonly FigureToolBindingRequirement[]
  minimumInteraction?: FigureToolInteractionBinding
}>

function defineFigureToolCapabilities<
  const Definitions extends readonly FigureToolDefinition[],
>(definitions: Definitions) {
  const ids = new Set<string>()
  for (const definition of definitions) {
    if (ids.has(definition.id)) {
      throw new Error(`Duplicate figure tool id: ${definition.id}`)
    }
    ids.add(definition.id)
  }
  return definitions
}

export const FIGURE_TOOL_CAPABILITIES = defineFigureToolCapabilities([
  {
    id: 'hydraulic-models',
    label: 'Hydraulic models',
    input: 'hydraulic-models',
    requiredBindings: ['state', 'persistence', 'interaction'],
    minimumInteraction: 'panel',
  },
  {
    id: 'map-overlays',
    label: 'Map overlays',
    input: 'map-overlays',
    requiredBindings: ['state', 'render', 'persistence', 'interaction'],
    minimumInteraction: 'panel',
  },
  {
    id: 'assessment-lines',
    label: 'WSE assessment lines',
    requiredBindings: ['state', 'render', 'persistence', 'interaction'],
    minimumInteraction: 'panel',
  },
  {
    id: 'map-cartography',
    label: 'Map cartography',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'frame-view',
    label: 'Frame and view',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'figure-elements',
    label: 'Figure elements',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'centerline-stationing',
    label: 'Centerline stationing',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'annotations',
    label: 'Annotations and callouts',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'canvas',
  },
  {
    id: 'chart-line-styles',
    label: 'Chart line styles',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'chart-axes',
    label: 'Chart axes and text',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'single-figure-export',
    label: 'Single-figure export',
    requiredBindings: [
      'settings',
      'state',
      'render',
      'persistence',
      'interaction',
      'export',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'batch-figure-generation',
    label: 'Batch figure generation',
    requiredBindings: [
      'state',
      'render',
      'persistence',
      'interaction',
      'export',
    ],
    minimumInteraction: 'panel',
  },
  {
    id: 'figure-document-export',
    label: 'Figure document export',
    requiredBindings: [
      'state',
      'render',
      'persistence',
      'interaction',
      'export',
    ],
    minimumInteraction: 'panel',
  },
] as const)

export type FigureToolId = (typeof FIGURE_TOOL_CAPABILITIES)[number]['id']

export type FigureToolBindings<SectionKey extends string = string> = Readonly<{
  settingsSection?: SectionKey
  state?: FigureToolStateBinding
  render?: readonly FigureToolRenderBinding[]
  persistence?: FigureToolPersistenceBinding
  interaction?: FigureToolInteractionBinding
  export?: readonly FigureToolExportBinding[]
}>

export type FigureToolSupport<SectionKey extends string = string> = Readonly<{
  id: FigureToolId
  bindings: FigureToolBindings<SectionKey>
}>

export type FigureToolEditorContract<SectionKey extends string = string> = {
  inputs: readonly WorkspaceInputCapability[]
  settingsSections: readonly { key: SectionKey }[]
  supportedTools: readonly FigureToolSupport<SectionKey>[]
}

export function figureToolCapability(id: FigureToolId): FigureToolDefinition {
  const capabilities: readonly FigureToolDefinition[] =
    FIGURE_TOOL_CAPABILITIES
  const capability = capabilities.find(
    (candidate) => candidate.id === id,
  )
  if (!capability) throw new Error(`Unknown figure tool: ${id}`)
  return capability
}

export function hasFigureTool(
  tools: readonly FigureToolSupport[],
  id: FigureToolId,
) {
  return tools.some((tool) => tool.id === id)
}

function hasBinding(
  bindings: FigureToolBindings,
  requirement: FigureToolBindingRequirement,
) {
  if (requirement === 'settings') return Boolean(bindings.settingsSection)
  if (requirement === 'render') return Boolean(bindings.render?.length)
  if (requirement === 'export') return Boolean(bindings.export?.length)
  return Boolean(bindings[requirement])
}

function interactionRank(binding: FigureToolInteractionBinding) {
  return binding === 'canvas' ? 2 : 1
}

export function assertFigureToolSupportContract<SectionKey extends string>(
  editor: FigureToolEditorContract<SectionKey>,
) {
  const ids = new Set<FigureToolId>()
  const sections = new Set(editor.settingsSections.map((section) => section.key))
  for (const tool of editor.supportedTools) {
    if (ids.has(tool.id)) {
      throw new Error(`Duplicate supported figure tool: ${tool.id}`)
    }
    ids.add(tool.id)
    const capability = figureToolCapability(tool.id)
    if (capability.input && !editor.inputs.includes(capability.input)) {
      throw new Error(
        `Figure tool ${tool.id} requires input capability ${capability.input}`,
      )
    }
    for (const requirement of capability.requiredBindings) {
      if (!hasBinding(tool.bindings, requirement)) {
        throw new Error(
          `Figure tool ${tool.id} requires a ${requirement} binding`,
        )
      }
    }
    if (
      tool.bindings.settingsSection &&
      !sections.has(tool.bindings.settingsSection)
    ) {
      throw new Error(
        `Figure tool ${tool.id} references unknown settings section ${tool.bindings.settingsSection}`,
      )
    }
    if (
      capability.minimumInteraction &&
      tool.bindings.interaction &&
      interactionRank(tool.bindings.interaction) <
        interactionRank(capability.minimumInteraction)
    ) {
      throw new Error(
        `Figure tool ${tool.id} requires ${capability.minimumInteraction} interaction`,
      )
    }
  }
}
