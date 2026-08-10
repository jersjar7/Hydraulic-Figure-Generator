import type {
  ChartAxesSettings,
  ChartLayoutSettings,
  ChartLegendSettings,
  ChartLineStyle,
} from '../../core/contracts/chartStyle'

export type ChartPlotFrame = {
  left: number
  top: number
  width: number
  height: number
}

export type ChartNumericDomain = { minimum: number; maximum: number }

export type ChartLegendEntry = {
  label: string
  style: ChartLineStyle
}

function niceStep(span: number, targetTicks: number) {
  const rough = span / Math.max(1, targetTicks)
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)))
  return [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate >= rough) ?? 10 * magnitude
}

export function chartRgba(hex: string, opacity: number) {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

export function roundedChartBox(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  fill = 'rgba(255, 255, 255, 0.94)',
  stroke = '#aeb8c3',
) {
  context.beginPath()
  context.roundRect(left, top, width, height, 5)
  context.fillStyle = fill
  context.fill()
  context.strokeStyle = stroke
  context.lineWidth = 1
  context.stroke()
}

export function drawChartAxes(
  context: CanvasRenderingContext2D,
  plot: ChartPlotFrame,
  xDomain: ChartNumericDomain,
  yDomain: ChartNumericDomain,
  axes: ChartAxesSettings,
  targetXTicks: number,
) {
  const x = (value: number) => plot.left
    + ((value - xDomain.minimum) / (xDomain.maximum - xDomain.minimum)) * plot.width
  const y = (value: number) => plot.top
    + ((yDomain.maximum - value) / (yDomain.maximum - yDomain.minimum)) * plot.height
  const xStep = axes.xGridSpacing ?? niceStep(xDomain.maximum - xDomain.minimum, targetXTicks)
  const yStep = axes.yGridSpacing ?? niceStep(yDomain.maximum - yDomain.minimum, 8)

  context.save()
  context.fillStyle = axes.plotBackgroundColor
  context.fillRect(plot.left, plot.top, plot.width, plot.height)
  context.font = `${axes.fontSize}px Arial`
  context.fillStyle = axes.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let value = Math.ceil(xDomain.minimum / xStep) * xStep; value <= xDomain.maximum + xStep * 0.01; value += xStep) {
    const location = x(value)
    if (axes.showGrid) {
      context.strokeStyle = axes.gridColor
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(location, plot.top)
      context.lineTo(location, plot.top + plot.height)
      context.stroke()
    }
    context.fillStyle = axes.textColor
    context.fillText(value.toFixed(xStep < 1 ? 1 : 0), location, plot.top + plot.height + 12)
  }
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  for (let value = Math.ceil(yDomain.minimum / yStep) * yStep; value <= yDomain.maximum + yStep * 0.01; value += yStep) {
    const location = y(value)
    if (axes.showGrid) {
      context.strokeStyle = axes.gridColor
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(plot.left, location)
      context.lineTo(plot.left + plot.width, location)
      context.stroke()
    }
    context.fillStyle = axes.textColor
    context.fillText(value.toFixed(yStep < 1 ? 1 : 0), plot.left - 12, location)
  }
  context.strokeStyle = axes.frameColor
  context.lineWidth = axes.frameWidth
  context.strokeRect(plot.left, plot.top, plot.width, plot.height)
  context.restore()
  return { x, y }
}

export function drawChartLegend(
  context: CanvasRenderingContext2D,
  entries: readonly ChartLegendEntry[],
  plot: ChartPlotFrame,
  legend: ChartLegendSettings,
  textColor: string,
  fontSize: number,
) {
  if (!legend.visible || entries.length === 0) return
  const size = Math.max(12, fontSize - 2)
  context.save()
  context.font = `${size}px Arial`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  const width = Math.max(...entries.map((entry) => context.measureText(entry.label).width)) + 72
  const height = entries.length * (size + 11) + 18
  const left = legend.position.endsWith('right')
    ? plot.left + plot.width - width - 15
    : plot.left + 15
  const top = legend.position.startsWith('bottom')
    ? plot.top + plot.height - height - 15
    : plot.top + 15
  roundedChartBox(
    context,
    left,
    top,
    width,
    height,
    chartRgba(legend.backgroundColor, legend.backgroundOpacity),
    legend.borderColor,
  )
  entries.forEach((entry, index) => {
    const location = top + 20 + index * (size + 11)
    context.strokeStyle = entry.style.color
    context.lineWidth = entry.style.width
    context.setLineDash(entry.style.dash)
    context.beginPath()
    context.moveTo(left + 12, location)
    context.lineTo(left + 48, location)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = textColor
    context.fillText(entry.label, left + 57, location)
  })
  context.restore()
}

export function drawChartLabels(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  plot: ChartPlotFrame,
  layout: ChartLayoutSettings,
  axes: ChartAxesSettings,
  subtitle?: string,
) {
  context.save()
  context.fillStyle = axes.textColor
  context.textAlign = 'center'
  context.font = `700 ${axes.fontSize + 8}px Arial`
  context.fillText(layout.title, canvas.width / 2, 43)
  if (subtitle) {
    context.font = `600 ${axes.fontSize + 1}px Arial`
    context.fillText(subtitle, canvas.width / 2, 78)
  }
  context.font = `${axes.fontSize + 2}px Arial`
  context.fillText(axes.xLabel, plot.left + plot.width / 2, plot.top + plot.height + 58)
  context.translate(35, plot.top + plot.height / 2)
  context.rotate(-Math.PI / 2)
  context.fillText(axes.yLabel, 0, 0)
  context.restore()
}
