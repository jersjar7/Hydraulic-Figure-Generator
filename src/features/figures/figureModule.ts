import type { MapElementBounds } from '../../core/types'

export type FigureModule<
  Settings,
  Scene,
  BuildRequest,
  RenderRequest,
> = {
  id: string
  label: string
  workspaceLabel: string
  description: string
  createDefaultSettings(): Settings
  canGenerate(request: BuildRequest): boolean
  buildScene(request: BuildRequest): Scene
  render(request: RenderRequest): Promise<MapElementBounds[]>
  exportFileName(scene: Scene): string
}
