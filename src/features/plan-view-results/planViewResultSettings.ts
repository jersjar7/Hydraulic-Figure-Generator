import { createDefaultFigureSettings } from '../../core/defaults'
import type { PlanViewResultSettings } from '../../core/types'

export function createDefaultPlanViewResultSettings(): PlanViewResultSettings {
  const defaults = createDefaultFigureSettings()
  return {
    ...defaults,
    resultParameter: 'Water_Depth_ft',
    ramp: 'depth',
    legendMin: null,
    legendMax: null,
    scalarLegendInterval: null,
    showContours: true,
    contourInterval: null,
    contourColor: '#111827',
    contourWidth: 1.25,
    contourPattern: 'solid',
    meshLineColor: '#30343b',
    meshLineWidth: 0.75,
    meshLineOpacity: 0.65,
    meshLinePattern: 'solid',
    velocityVectors: {
      visible: false,
      lengthMode: 'uniform',
      spacing: 70,
      length: 20,
      color: '#111827',
      lineWidth: 1.5,
      headSize: 5,
      minimumMagnitude: 0,
    },
    showWetDry: false,
    showWetDryKey: false,
    showAssessmentLines: false,
    showAssessmentLabels: false,
    titleTemplate: '{condition}: {run} - {parameter} ({units})',
    elementStyles: {
      ...defaults.elementStyles,
      diffLegend: {
        ...defaults.elementStyles.diffLegend,
        title: 'Water Depth',
        units: 'ft',
      },
    },
  }
}
