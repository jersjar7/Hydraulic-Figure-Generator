import type {
  PlanViewResultSettings,
  ScalarResultMetadata,
} from '../../core/types'

export function withPlanViewOutputSettings(
  settings: PlanViewResultSettings,
  output: ScalarResultMetadata,
): PlanViewResultSettings {
  return {
    ...settings,
    resultParameter: output.paramName,
    ramp: output.defaultRamp,
    legendMin: null,
    legendMax: null,
    scalarLegendInterval: null,
    elementStyles: {
      ...settings.elementStyles,
      diffLegend: {
        ...settings.elementStyles.diffLegend,
        title: output.label,
        units: output.units,
      },
    },
  }
}
