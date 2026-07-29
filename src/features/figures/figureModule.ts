import type {
  MapElementBounds,
  ScenarioRole,
} from '../../core/types'

export type FigureEditorSection<Key extends string = string> = {
  key: Key
  label: string
  title: string
}

export type FigureEditorCapabilities<
  SectionKey extends string = string,
> = {
  requiredScenarioRoles: readonly ScenarioRole[]
  optionalScenarioRoles: readonly ScenarioRole[]
  shapefileOverlays: boolean
  assessmentLines: boolean
  centerlineStationing: boolean
  annotations: boolean
  projectFileExtension: string
  settingsSections: readonly FigureEditorSection<SectionKey>[]
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
