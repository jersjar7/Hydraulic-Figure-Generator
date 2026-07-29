export type FigureViewDocument<Settings, ViewBounds> = {
  bounds: ViewBounds
  settings: Settings
}

export type FigureRenderDocument<
  Scene,
  Settings,
  ViewBounds,
  Layers,
  Selection,
> = {
  scene: Scene
  view: FigureViewDocument<Settings, ViewBounds>
  layers: Layers
  selection: Selection
}
