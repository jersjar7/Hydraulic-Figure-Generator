import {
  CHART_LEGEND_POSITIONS,
  CHART_LINE_PATTERNS,
  type ChartAxesSettings,
  type ChartLayoutSettings,
  type ChartLegendSettings,
  type ChartLinePattern,
  type ChartLineStyle,
} from './contracts/chartStyle'

const PATTERN_DASHES: Record<ChartLinePattern, readonly number[]> = {
  solid: [],
  dashed: [10, 6],
  dotted: [2, 5],
  'dash-dot': [12, 4, 2, 4],
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function chartLineDash(pattern: ChartLinePattern) {
  return [...PATTERN_DASHES[pattern]]
}

export function chartLinePattern(style: ChartLineStyle): ChartLinePattern {
  const dash = style.dash.join(',')
  return CHART_LINE_PATTERNS.find(
    (pattern) => PATTERN_DASHES[pattern].join(',') === dash,
  ) ?? (style.dash.length === 0 ? 'solid' : 'dashed')
}

export function withChartLinePattern(
  style: ChartLineStyle,
  pattern: ChartLinePattern,
): ChartLineStyle {
  return { ...style, dash: chartLineDash(pattern) }
}

export function createDefaultChartLegendSettings(): ChartLegendSettings {
  return {
    visible: true,
    position: 'top-right',
    backgroundColor: '#ffffff',
    backgroundOpacity: 0.94,
    borderColor: '#a9b4c2',
  }
}

export function createDefaultChartAxesSettings(
  yLabel = 'Elevation (feet, NAVD88)',
): ChartAxesSettings {
  return {
    showGrid: true,
    xGridSpacing: null,
    yGridSpacing: null,
    yMinimum: null,
    yMaximum: null,
    fontSize: 18,
    textColor: '#263746',
    xLabel: 'Distance (feet)',
    yLabel,
    gridColor: '#dbe1e7',
    plotBackgroundColor: '#fbfcfd',
    frameColor: '#263746',
    frameWidth: 1.5,
  }
}

export function chartStyleValidationIssues({
  layout,
  legend,
  axes,
  lines,
}: {
  layout: ChartLayoutSettings
  legend: ChartLegendSettings
  axes: ChartAxesSettings
  lines: readonly ChartLineStyle[]
}) {
  const issues: string[] = []
  if (typeof layout.title !== 'string' || !layout.title.trim()) {
    issues.push('Figure title is required.')
  }
  if (!['landscape', 'portrait'].includes(layout.orientation)) {
    issues.push('Figure orientation is invalid.')
  }
  if (!CHART_LEGEND_POSITIONS.includes(legend.position)) {
    issues.push('Legend position is invalid.')
  }
  for (const [label, color] of [
    ['Legend background', legend.backgroundColor],
    ['Legend border', legend.borderColor],
    ['Text', axes.textColor],
    ['Grid', axes.gridColor],
    ['Plot background', axes.plotBackgroundColor],
    ['Plot frame', axes.frameColor],
  ] as const) {
    if (!HEX_COLOR.test(color)) issues.push(`${label} color is invalid.`)
  }
  if (!Number.isFinite(legend.backgroundOpacity)
    || legend.backgroundOpacity < 0
    || legend.backgroundOpacity > 1) {
    issues.push('Legend background opacity must be between 0 and 1.')
  }
  if (!Number.isFinite(axes.fontSize) || axes.fontSize < 8 || axes.fontSize > 40) {
    issues.push('Chart text size must be between 8 and 40 pixels.')
  }
  if (!Number.isFinite(axes.frameWidth) || axes.frameWidth < 0.5 || axes.frameWidth > 8) {
    issues.push('Plot frame width must be between 0.5 and 8 pixels.')
  }
  if (axes.xGridSpacing != null && (!Number.isFinite(axes.xGridSpacing) || axes.xGridSpacing <= 0)) {
    issues.push('Horizontal grid spacing must be greater than zero or automatic.')
  }
  if (axes.yGridSpacing != null && (!Number.isFinite(axes.yGridSpacing) || axes.yGridSpacing <= 0)) {
    issues.push('Vertical grid spacing must be greater than zero or automatic.')
  }
  if (typeof axes.xLabel !== 'string' || typeof axes.yLabel !== 'string') {
    issues.push('Axis labels must be text.')
  }
  if (axes.yMinimum != null && !Number.isFinite(axes.yMinimum)) {
    issues.push('Y minimum must be numeric or automatic.')
  }
  if (axes.yMaximum != null && !Number.isFinite(axes.yMaximum)) {
    issues.push('Y maximum must be numeric or automatic.')
  }
  if (
    axes.yMinimum != null
    && axes.yMaximum != null
    && axes.yMaximum <= axes.yMinimum
  ) issues.push('Y maximum must be greater than Y minimum.')
  lines.forEach((line, index) => {
    if (!HEX_COLOR.test(line.color)) issues.push(`Series ${index + 1} color is invalid.`)
    if (!Number.isFinite(line.width) || line.width < 0.5 || line.width > 8) {
      issues.push(`Series ${index + 1} width must be between 0.5 and 8 pixels.`)
    }
    if (!Array.isArray(line.dash) || line.dash.some((value) => !Number.isFinite(value) || value < 0)) {
      issues.push(`Series ${index + 1} dash pattern is invalid.`)
    }
  })
  return issues
}

export function assertValidChartStyle(
  value: Parameters<typeof chartStyleValidationIssues>[0],
) {
  const issues = chartStyleValidationIssues(value)
  if (issues.length > 0) throw new Error(issues[0])
}
