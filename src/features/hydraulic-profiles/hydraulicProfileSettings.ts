import {
  createDefaultChartAxesSettings,
  createDefaultChartLegendSettings,
} from '../../core/chartStyle'
import type {
  ChartLegendPosition,
  ChartLineStyle,
} from '../../core/contracts/chartStyle'
import {
  createDefaultLongitudinalStationingSettings,
  type LongitudinalStationingSettings,
} from '../../core/types'

export type HydraulicProfileLineStyle = ChartLineStyle

export type HydraulicProfileFigureSettings = {
  orientation: 'landscape' | 'portrait'
  title: string
  lookingDirection: 'downstream' | 'upstream'
  showGrid: boolean
  xGridSpacing: number | null
  yGridSpacing: number | null
  showLegend: boolean
  showEarthFill: boolean
  showInundation: boolean
  showThalweg: boolean
  yMinimum: number | null
  yMaximum: number | null
  fontSize: number
  textColor: string
  earthFillGroundSlot: number | null
  clipWseAtGround: boolean
  wseClippingGroundSlot: number | null
  inundationGroundSlot: number | null
  inundationSurfaceSlot: number | null
  lineStyles: HydraulicProfileLineStyle[]
  lineVisibility: boolean[]
  lineOrder: number[]
  legendPosition: ChartLegendPosition
  legendBackgroundColor: string
  legendBackgroundOpacity: number
  legendBorderColor: string
  xAxisLabel: string
  yAxisLabel: string
  gridColor: string
  plotBackgroundColor: string
  frameColor: string
  frameWidth: number
  longitudinalStationing: LongitudinalStationingSettings
}

const LINE_COLORS = [
  '#7a5a36',
  '#1769aa',
  '#2c9c62',
  '#a63dd3',
  '#ef941a',
  '#168c9b',
  '#c0443e',
  '#6477c9',
  '#5f7d3d',
  '#7c4f9f',
  '#3f6978',
  '#9b5b3f',
  '#536f9d',
]

export function defaultHydraulicProfileLineStyle(slot: number): HydraulicProfileLineStyle {
  return {
    color: LINE_COLORS[slot % LINE_COLORS.length],
    width: slot === 0 ? 3 : 2.25,
    dash: slot >= 4 ? [10, 6] : [],
  }
}

export function hydraulicProfileLineStyle(
  settings: HydraulicProfileFigureSettings,
  slot: number,
) {
  return settings.lineStyles[slot] ?? defaultHydraulicProfileLineStyle(slot)
}

export function createDefaultHydraulicProfileSettings(): HydraulicProfileFigureSettings {
  const axes = createDefaultChartAxesSettings()
  const legend = createDefaultChartLegendSettings()
  return {
    orientation: 'landscape',
    title: 'Hydraulic Cross Section',
    lookingDirection: 'downstream',
    showGrid: true,
    xGridSpacing: axes.xGridSpacing,
    yGridSpacing: axes.yGridSpacing,
    showLegend: true,
    showEarthFill: true,
    showInundation: true,
    showThalweg: true,
    yMinimum: null,
    yMaximum: null,
    fontSize: 18,
    textColor: '#263746',
    earthFillGroundSlot: null,
    clipWseAtGround: true,
    wseClippingGroundSlot: null,
    inundationGroundSlot: null,
    inundationSurfaceSlot: null,
    lineStyles: LINE_COLORS.map((_, slot) => defaultHydraulicProfileLineStyle(slot)),
    lineVisibility: LINE_COLORS.map(() => true),
    lineOrder: LINE_COLORS.map((_, slot) => slot),
    legendPosition: legend.position,
    legendBackgroundColor: legend.backgroundColor,
    legendBackgroundOpacity: legend.backgroundOpacity,
    legendBorderColor: legend.borderColor,
    xAxisLabel: axes.xLabel,
    yAxisLabel: axes.yLabel,
    gridColor: axes.gridColor,
    plotBackgroundColor: axes.plotBackgroundColor,
    frameColor: axes.frameColor,
    frameWidth: axes.frameWidth,
    longitudinalStationing: createDefaultLongitudinalStationingSettings(),
  }
}
