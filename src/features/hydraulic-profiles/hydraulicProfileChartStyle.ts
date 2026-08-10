import type {
  ChartAxesSettings,
  ChartLayoutSettings,
  ChartLegendSettings,
  ChartLineStyle,
  ChartSeriesControl,
} from '../../core/contracts/chartStyle'
import type { HydraulicProfileLine } from '../../core/types'
import {
  defaultHydraulicProfileLineStyle,
  hydraulicProfileLineStyle,
  type HydraulicProfileFigureSettings,
} from './hydraulicProfileSettings'

function orderedSlots(
  settings: HydraulicProfileFigureSettings,
  lines: readonly HydraulicProfileLine[],
) {
  const slots = lines.map((line) => line.datasetSlot)
  const known = settings.lineOrder.filter((slot) => slots.includes(slot))
  return [...known, ...slots.filter((slot) => !known.includes(slot))]
}

export function hydraulicProfileChartLayout(
  settings: HydraulicProfileFigureSettings,
): ChartLayoutSettings {
  return { title: settings.title, orientation: settings.orientation }
}

export function hydraulicProfileChartLegend(
  settings: HydraulicProfileFigureSettings,
): ChartLegendSettings {
  return {
    visible: settings.showLegend,
    position: settings.legendPosition,
    backgroundColor: settings.legendBackgroundColor,
    backgroundOpacity: settings.legendBackgroundOpacity,
    borderColor: settings.legendBorderColor,
  }
}

export function hydraulicProfileChartAxes(
  settings: HydraulicProfileFigureSettings,
): ChartAxesSettings {
  return {
    showGrid: settings.showGrid,
    yMinimum: settings.yMinimum,
    yMaximum: settings.yMaximum,
    fontSize: settings.fontSize,
    textColor: settings.textColor,
    xLabel: settings.xAxisLabel,
    yLabel: settings.yAxisLabel,
    gridColor: settings.gridColor,
    plotBackgroundColor: settings.plotBackgroundColor,
    frameColor: settings.frameColor,
    frameWidth: settings.frameWidth,
  }
}

export function hydraulicProfileChartSeries(
  settings: HydraulicProfileFigureSettings,
  lines: readonly HydraulicProfileLine[],
): ChartSeriesControl<number>[] {
  const lineBySlot = new Map(lines.map((line) => [line.datasetSlot, line]))
  return orderedSlots(settings, lines).map((slot) => {
    const line = lineBySlot.get(slot)!
    return {
      id: slot,
      label: line.name,
      visible: settings.lineVisibility[slot] ?? true,
      style: hydraulicProfileLineStyle(settings, slot),
    }
  })
}

export function applyHydraulicProfileChartLayout(
  settings: HydraulicProfileFigureSettings,
  value: ChartLayoutSettings,
) {
  return { ...settings, title: value.title, orientation: value.orientation }
}

export function applyHydraulicProfileChartLegend(
  settings: HydraulicProfileFigureSettings,
  value: ChartLegendSettings,
) {
  return {
    ...settings,
    showLegend: value.visible,
    legendPosition: value.position,
    legendBackgroundColor: value.backgroundColor,
    legendBackgroundOpacity: value.backgroundOpacity,
    legendBorderColor: value.borderColor,
  }
}

export function applyHydraulicProfileChartAxes(
  settings: HydraulicProfileFigureSettings,
  value: ChartAxesSettings,
) {
  return {
    ...settings,
    showGrid: value.showGrid,
    yMinimum: value.yMinimum,
    yMaximum: value.yMaximum,
    fontSize: value.fontSize,
    textColor: value.textColor,
    xAxisLabel: value.xLabel,
    yAxisLabel: value.yLabel,
    gridColor: value.gridColor,
    plotBackgroundColor: value.plotBackgroundColor,
    frameColor: value.frameColor,
    frameWidth: value.frameWidth,
  }
}

export function updateHydraulicProfileLineStyle(
  settings: HydraulicProfileFigureSettings,
  slot: number,
  style: ChartLineStyle,
) {
  const lineStyles = [...settings.lineStyles]
  while (lineStyles.length <= slot) {
    lineStyles.push(defaultHydraulicProfileLineStyle(lineStyles.length))
  }
  lineStyles[slot] = style
  return { ...settings, lineStyles }
}

export function updateHydraulicProfileLineVisibility(
  settings: HydraulicProfileFigureSettings,
  slot: number,
  visible: boolean,
) {
  const lineVisibility = [...settings.lineVisibility]
  while (lineVisibility.length <= slot) lineVisibility.push(true)
  lineVisibility[slot] = visible
  return { ...settings, lineVisibility }
}

export function moveHydraulicProfileSeries(
  settings: HydraulicProfileFigureSettings,
  lines: readonly HydraulicProfileLine[],
  slot: number,
  direction: -1 | 1,
) {
  const lineOrder = orderedSlots(settings, lines)
  const index = lineOrder.indexOf(slot)
  const target = index + direction
  if (index < 0 || target < 0 || target >= lineOrder.length) return settings
  ;[lineOrder[index], lineOrder[target]] = [lineOrder[target], lineOrder[index]]
  return { ...settings, lineOrder }
}
