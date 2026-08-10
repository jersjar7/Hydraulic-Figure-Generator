import type { WorkspaceInputCapability } from '../../core/contracts/workspace'
import type {
  MapElementBounds,
  ScenarioRole,
} from '../../core/types'
import {
  assertFigureToolSupportContract,
  hasFigureTool,
  type FigureToolSupport,
} from '../tools/figureToolCapability'

export type FigureEditorSection<Key extends string = string> = {
  key: Key
  label: string
  title: string
}

export type FigureEditorDefinition<
  SectionKey extends string = string,
> = {
  inputs: readonly WorkspaceInputCapability[]
  requiredScenarioRoles: readonly ScenarioRole[]
  optionalScenarioRoles: readonly ScenarioRole[]
  projectFileExtension: string
  settingsSections: readonly FigureEditorSection<SectionKey>[]
  supportedTools: readonly FigureToolSupport<SectionKey>[]
}

export type FigureEditorCapabilities<
  SectionKey extends string = string,
> = FigureEditorDefinition<SectionKey> & {
  /** @deprecated Read from supportedTools through hasFigureTool instead. */
  readonly shapefileOverlays: boolean
  /** @deprecated Read from supportedTools through hasFigureTool instead. */
  readonly assessmentLines: boolean
  /** @deprecated Read from supportedTools through hasFigureTool instead. */
  readonly centerlineStationing: boolean
  /** @deprecated Read from supportedTools through hasFigureTool instead. */
  readonly annotations: boolean
}

export function defineFigureEditor<SectionKey extends string>(
  definition: FigureEditorDefinition<SectionKey>,
): FigureEditorCapabilities<SectionKey> {
  assertFigureToolSupportContract(definition)
  return {
    ...definition,
    shapefileOverlays: hasFigureTool(definition.supportedTools, 'map-overlays'),
    assessmentLines: hasFigureTool(definition.supportedTools, 'assessment-lines'),
    centerlineStationing: hasFigureTool(
      definition.supportedTools,
      'centerline-stationing',
    ),
    annotations: hasFigureTool(definition.supportedTools, 'annotations'),
  }
}

export type FigureModule<
  Settings,
  Scene,
  BuildRequest,
  RenderRequest,
  SectionKey extends string = string,
> = {
  id: string
  label: string
  workspaceLabel: string
  description: string
  editor: FigureEditorCapabilities<SectionKey>
  createDefaultSettings(): Settings
  canGenerate(request: BuildRequest): boolean
  buildScene(request: BuildRequest): Scene
  render(request: RenderRequest): Promise<MapElementBounds[]>
  exportFileName(scene: Scene): string
}
