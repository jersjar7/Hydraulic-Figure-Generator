import type {
  ChartAxesSettings,
  ChartLayoutSettings,
  ChartLegendSettings,
  ChartLineStyle,
  ChartSeriesControl,
} from '../../core/contracts/chartStyle'
import type {
  CrossSectionFigureSettings,
  CrossSectionSeriesKey,
} from './crossSectionSettings'

const SERIES_KEYS: readonly CrossSectionSeriesKey[] = [
  'existing-ground',
  'proposed-ground',
  'existing-wse',
  'proposed-wse',
]

function orderedKeys(settings: CrossSectionFigureSettings) {
  const known = settings.seriesOrder.filter((key) => SERIES_KEYS.includes(key))
  return [...known, ...SERIES_KEYS.filter((key) => !known.includes(key))]
}

function seriesValue(
  settings: CrossSectionFigureSettings,
  key: CrossSectionSeriesKey,
): ChartSeriesControl<CrossSectionSeriesKey> {
  if (key === 'existing-ground') return {
    id: key,
    label: settings.existingGroundLabel,
    visible: settings.showExistingGround,
    style: settings.existingGroundStyle,
  }
  if (key === 'proposed-ground') return {
    id: key,
    label: settings.proposedGroundLabel,
    visible: settings.showProposedGround,
    style: settings.proposedGroundStyle,
  }
  if (key === 'existing-wse') return {
    id: key,
    label: settings.existingWseLabel,
    visible: settings.showExistingWse,
    style: settings.existingWseStyle,
  }
  return {
    id: key,
    label: settings.proposedWseLabel,
    visible: settings.showProposedWse,
    style: settings.proposedWseStyle,
  }
}

export function crossSectionChartLayout(
  settings: CrossSectionFigureSettings,
): ChartLayoutSettings {
  return { title: settings.title, orientation: settings.orientation }
}

export function crossSectionChartLegend(
  settings: CrossSectionFigureSettings,
): ChartLegendSettings {
  return {
    visible: settings.showLegend,
    position: settings.legendPosition,
    backgroundColor: settings.legendBackgroundColor,
    backgroundOpacity: settings.legendBackgroundOpacity,
    borderColor: settings.legendBorderColor,
  }
}

export function crossSectionChartAxes(
  settings: CrossSectionFigureSettings,
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

export function crossSectionChartSeries(settings: CrossSectionFigureSettings) {
  return orderedKeys(settings).map((key) => seriesValue(settings, key))
}

export function applyCrossSectionChartLayout(
  settings: CrossSectionFigureSettings,
  value: ChartLayoutSettings,
): CrossSectionFigureSettings {
  return { ...settings, title: value.title, orientation: value.orientation }
}

export function applyCrossSectionChartLegend(
  settings: CrossSectionFigureSettings,
  value: ChartLegendSettings,
): CrossSectionFigureSettings {
  return {
    ...settings,
    showLegend: value.visible,
    legendPosition: value.position,
    legendBackgroundColor: value.backgroundColor,
    legendBackgroundOpacity: value.backgroundOpacity,
    legendBorderColor: value.borderColor,
  }
}

export function applyCrossSectionChartAxes(
  settings: CrossSectionFigureSettings,
  value: ChartAxesSettings,
): CrossSectionFigureSettings {
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

export function updateCrossSectionSeries(
  settings: CrossSectionFigureSettings,
  key: CrossSectionSeriesKey,
  update: Partial<Pick<ChartSeriesControl, 'label' | 'visible'>> & {
    style?: ChartLineStyle
  },
) {
  const field = key === 'existing-ground'
    ? ['existingGroundLabel', 'showExistingGround', 'existingGroundStyle'] as const
    : key === 'proposed-ground'
      ? ['proposedGroundLabel', 'showProposedGround', 'proposedGroundStyle'] as const
      : key === 'existing-wse'
        ? ['existingWseLabel', 'showExistingWse', 'existingWseStyle'] as const
        : ['proposedWseLabel', 'showProposedWse', 'proposedWseStyle'] as const
  return {
    ...settings,
    ...(update.label == null ? {} : { [field[0]]: update.label }),
    ...(update.visible == null ? {} : { [field[1]]: update.visible }),
    ...(update.style == null ? {} : { [field[2]]: update.style }),
  }
}

export function moveCrossSectionSeries(
  settings: CrossSectionFigureSettings,
  key: CrossSectionSeriesKey,
  direction: -1 | 1,
) {
  const order = orderedKeys(settings)
  const index = order.indexOf(key)
  const target = index + direction
  if (index < 0 || target < 0 || target >= order.length) return settings
  ;[order[index], order[target]] = [order[target], order[index]]
  return { ...settings, seriesOrder: order }
}
