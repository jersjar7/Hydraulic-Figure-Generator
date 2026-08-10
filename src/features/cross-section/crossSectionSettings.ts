import {
  createDefaultChartAxesSettings,
  createDefaultChartLegendSettings,
} from '../../core/chartStyle'
import type {
  ChartLegendPosition,
  ChartLineStyle,
} from '../../core/contracts/chartStyle'

export type CrossSectionLineStyle = ChartLineStyle
export type CrossSectionSeriesKey =
  | 'existing-ground'
  | 'proposed-ground'
  | 'existing-wse'
  | 'proposed-wse'

export type CrossSectionFigureSettings = {
  orientation: 'landscape' | 'portrait'
  dryDepth: number
  sampleSpacing: number
  title: string
  sectionName: string
  lookingDirection: 'downstream' | 'upstream'
  downstreamSide: 'left' | 'right'
  showGrid: boolean
  showLegend: boolean
  showExistingGround: boolean
  showProposedGround: boolean
  showExistingWse: boolean
  showProposedWse: boolean
  showAverageWse: boolean
  showDifferenceArrow: boolean
  existingGroundStyle: CrossSectionLineStyle
  proposedGroundStyle: CrossSectionLineStyle
  existingWseStyle: CrossSectionLineStyle
  proposedWseStyle: CrossSectionLineStyle
  arrowColor: string
  textColor: string
  fontSize: number
  yMinimum: number | null
  yMaximum: number | null
  xAxisLabel: string
  yAxisLabel: string
  gridColor: string
  plotBackgroundColor: string
  frameColor: string
  frameWidth: number
  legendPosition: ChartLegendPosition
  legendBackgroundColor: string
  legendBackgroundOpacity: number
  legendBorderColor: string
  existingGroundLabel: string
  proposedGroundLabel: string
  existingWseLabel: string
  proposedWseLabel: string
  seriesOrder: CrossSectionSeriesKey[]
}

export function createDefaultCrossSectionSettings(): CrossSectionFigureSettings {
  const axes = createDefaultChartAxesSettings('Elevation (feet)')
  const legend = createDefaultChartLegendSettings()
  return {
    orientation: 'landscape',
    dryDepth: 0,
    sampleSpacing: 1,
    title: '100-Year Water-Surface Elevation Comparison',
    sectionName: 'Assessment Section',
    lookingDirection: 'downstream',
    downstreamSide: 'right',
    showGrid: true,
    showLegend: true,
    showExistingGround: true,
    showProposedGround: true,
    showExistingWse: true,
    showProposedWse: true,
    showAverageWse: true,
    showDifferenceArrow: true,
    existingGroundStyle: {
      color: '#b8862b',
      width: 2.5,
      dash: [12, 7],
    },
    proposedGroundStyle: {
      color: '#6f4728',
      width: 3,
      dash: [],
    },
    existingWseStyle: {
      color: '#00a2c7',
      width: 2.5,
      dash: [12, 4, 2, 4],
    },
    proposedWseStyle: {
      color: '#155da8',
      width: 2.5,
      dash: [10, 6],
    },
    arrowColor: '#c62828',
    textColor: '#17263b',
    fontSize: 18,
    yMinimum: axes.yMinimum,
    yMaximum: axes.yMaximum,
    xAxisLabel: axes.xLabel,
    yAxisLabel: axes.yLabel,
    gridColor: axes.gridColor,
    plotBackgroundColor: axes.plotBackgroundColor,
    frameColor: axes.frameColor,
    frameWidth: axes.frameWidth,
    legendPosition: legend.position,
    legendBackgroundColor: legend.backgroundColor,
    legendBackgroundOpacity: legend.backgroundOpacity,
    legendBorderColor: legend.borderColor,
    existingGroundLabel: 'Existing Ground',
    proposedGroundLabel: 'Proposed Ground',
    existingWseLabel: 'Existing 100-Year WSE',
    proposedWseLabel: 'Proposed 100-Year WSE',
    seriesOrder: [
      'existing-ground',
      'proposed-ground',
      'existing-wse',
      'proposed-wse',
    ],
  }
}
