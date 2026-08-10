import type {
  CartographySettings,
  PlanViewResultSettings,
  ScalarRampKey,
} from '../../core/types'

export function planViewCartographySettings(
  settings: PlanViewResultSettings,
): CartographySettings {
  return {
    classification: {
      ramp: settings.ramp,
      bounds: {
        mode: 'range',
        minimum: settings.legendMin,
        maximum: settings.legendMax,
      },
      interval: settings.scalarLegendInterval,
    },
    contours: {
      visible: settings.showContours,
      mode: 'scalar-isolines',
      interval: settings.contourInterval,
      color: settings.contourColor,
      width: settings.contourWidth,
      pattern: settings.contourPattern,
    },
    mesh: {
      color: settings.meshLineColor,
      width: settings.meshLineWidth,
      opacity: settings.meshLineOpacity,
      pattern: settings.meshLinePattern,
    },
  }
}

export function withPlanViewCartographySettings(
  settings: PlanViewResultSettings,
  cartography: CartographySettings,
): PlanViewResultSettings {
  const bounds = cartography.classification.bounds
  const contours = cartography.contours
  const mesh = cartography.mesh
  return {
    ...settings,
    ramp: cartography.classification.ramp as ScalarRampKey,
    legendMin: bounds.mode === 'range' ? bounds.minimum : settings.legendMin,
    legendMax: bounds.mode === 'range' ? bounds.maximum : settings.legendMax,
    scalarLegendInterval: cartography.classification.interval,
    showContours: contours?.visible ?? false,
    contourInterval: contours?.interval ?? settings.contourInterval,
    contourColor: contours?.color ?? settings.contourColor,
    contourWidth: contours?.width ?? settings.contourWidth,
    contourPattern: contours?.pattern ?? settings.contourPattern,
    meshLineColor: mesh?.color ?? settings.meshLineColor,
    meshLineWidth: mesh?.width ?? settings.meshLineWidth,
    meshLineOpacity: mesh?.opacity ?? settings.meshLineOpacity,
    meshLinePattern: mesh?.pattern ?? settings.meshLinePattern,
  }
}
