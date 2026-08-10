import type { CartographySettings, FigureSettings } from '../../core/types'

export function wseCartographySettings(
  settings: FigureSettings,
): CartographySettings {
  return {
    classification: {
      ramp: settings.differenceRamp,
      bounds: { mode: 'symmetric', bound: settings.legendBound },
      interval: settings.legendInterval,
    },
    contours: {
      visible: settings.showDifferenceOutlines,
      mode: 'class-boundaries',
      interval: null,
      color: settings.differenceOutlineColor,
      width: settings.differenceOutlineWidth,
      pattern: settings.differenceOutlinePattern,
    },
    mesh: null,
  }
}

export function withWseCartographySettings(
  settings: FigureSettings,
  cartography: CartographySettings,
): FigureSettings {
  const bounds = cartography.classification.bounds
  const contours = cartography.contours
  return {
    ...settings,
    differenceRamp: cartography.classification.ramp,
    legendBound: bounds.mode === 'symmetric' ? bounds.bound : settings.legendBound,
    legendInterval: cartography.classification.interval,
    showDifferenceOutlines: contours?.visible ?? false,
    differenceOutlineColor: contours?.color ?? settings.differenceOutlineColor,
    differenceOutlineWidth: contours?.width ?? settings.differenceOutlineWidth,
    differenceOutlinePattern:
      contours?.pattern ?? settings.differenceOutlinePattern,
  }
}
