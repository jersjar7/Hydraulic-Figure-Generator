import { createDefaultFigureSettings } from '../../core/defaults'

export function createDefaultCrossSectionMapSettings() {
  return {
    ...createDefaultFigureSettings(),
    showTitle: false,
    showLegend: false,
    showNorth: true,
    showScale: true,
    showWetDryKey: false,
    showAssessmentLabels: false,
  }
}
