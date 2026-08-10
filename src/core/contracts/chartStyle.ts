export const CHART_LINE_PATTERNS = [
  'solid',
  'dashed',
  'dotted',
  'dash-dot',
] as const

export const CHART_LEGEND_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

export type ChartLinePattern = (typeof CHART_LINE_PATTERNS)[number]
export type ChartLegendPosition = (typeof CHART_LEGEND_POSITIONS)[number]
export type ChartOrientation = 'landscape' | 'portrait'

export type ChartLineStyle = {
  color: string
  width: number
  dash: number[]
}

export type ChartLayoutSettings = {
  title: string
  orientation: ChartOrientation
}

export type ChartLegendSettings = {
  visible: boolean
  position: ChartLegendPosition
  backgroundColor: string
  backgroundOpacity: number
  borderColor: string
}

export type ChartAxesSettings = {
  showGrid: boolean
  xGridSpacing: number | null
  yGridSpacing: number | null
  yMinimum: number | null
  yMaximum: number | null
  fontSize: number
  textColor: string
  xLabel: string
  yLabel: string
  gridColor: string
  plotBackgroundColor: string
  frameColor: string
  frameWidth: number
}

export type ChartSeriesControl<Id extends string | number = string> = {
  id: Id
  label: string
  visible: boolean
  style: ChartLineStyle
}
