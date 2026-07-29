import type { FigureSettings } from '../../core/types'

export type FigureSettingsChange = <
  Key extends keyof FigureSettings,
>(
  key: Key,
  value: FigureSettings[Key],
) => void
