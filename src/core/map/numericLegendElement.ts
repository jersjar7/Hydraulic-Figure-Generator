import type {
  DifferenceLegendElementStyle,
  MapElementPositions,
} from '../types'
import { anchorBox, drawElementBox } from './mapElementLayout'
import type { MapFrame } from './view'

type NumericLegendOptions = {
  title: string
  labels: string[]
  bandCount: number
  colorForBand(band: number): string
}

export function drawNumericLegend(
  context: CanvasRenderingContext2D,
  options: NumericLegendOptions,
  frame: MapFrame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const padding = 12
  const titleHeight = style.fontSize + 14
  context.save()
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(options.title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    0,
    ...options.labels.map((label) => context.measureText(label).width),
  )

  const horizontal = style.orientation === 'horizontal'
  const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
  const swatchWidth = Math.round(style.swatchSize * 1.7)
  const horizontalBlockWidth = Math.max(
    style.swatchSize * 2,
    labelWidth + 36,
  )
  const width = horizontal
    ? Math.max(
        padding * 2 + titleWidth,
        padding * 2 + horizontalBlockWidth * options.bandCount,
      )
    : Math.max(
        padding * 2 + titleWidth,
        padding * 2 + swatchWidth + 12 + labelWidth,
      )
  const height = horizontal
    ? padding * 2 + titleHeight + style.swatchSize + style.fontSize + 14
    : padding * 2 + titleHeight + options.bandCount * blockHeight + style.fontSize / 2
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'diffLegend', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.fillText(options.title, x + padding, y + padding)

  const barX = x + padding
  const barTop = y + padding + titleHeight
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.strokeStyle = style.borderColor
  if (horizontal) {
    const barWidth = width - padding * 2
    const bandWidth = barWidth / options.bandCount
    for (let band = 0; band < options.bandCount; band += 1) {
      context.fillStyle = options.colorForBand(band)
      context.fillRect(
        barX + band * bandWidth,
        barTop,
        bandWidth,
        style.swatchSize,
      )
    }
    context.strokeRect(barX + 0.5, barTop + 0.5, barWidth, style.swatchSize)
    context.fillStyle = style.textColor
    context.textBaseline = 'top'
    options.labels.forEach((label, index) => {
      const labelX = barX + (index * barWidth) / options.bandCount
      context.textAlign =
        index === 0
          ? 'left'
          : index === options.bandCount
            ? 'right'
            : 'center'
      context.fillText(label, labelX, barTop + style.swatchSize + 7)
    })
  } else {
    const barHeight = options.bandCount * blockHeight
    const barBottom = barTop + barHeight
    for (let band = 0; band < options.bandCount; band += 1) {
      context.fillStyle = options.colorForBand(band)
      context.fillRect(
        barX,
        barBottom - (band + 1) * blockHeight,
        swatchWidth,
        blockHeight,
      )
    }
    context.strokeRect(barX + 0.5, barTop + 0.5, swatchWidth, barHeight)
    context.fillStyle = style.textColor
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    options.labels.forEach((label, index) => {
      const labelY = barBottom - index * blockHeight
      context.beginPath()
      context.moveTo(barX + swatchWidth, labelY)
      context.lineTo(barX + swatchWidth + 5, labelY)
      context.stroke()
      context.fillText(label, barX + swatchWidth + 9, labelY)
    })
  }
  context.restore()
  return bounds
}
