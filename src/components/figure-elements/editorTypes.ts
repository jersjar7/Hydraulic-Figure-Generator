import type {
  FigureSettings,
  MapElementKey,
  MapElementStyles,
} from '../../core/types'

export type ElementEditorProps = {
  settings: FigureSettings
  onStyleChange(
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ): void
}
