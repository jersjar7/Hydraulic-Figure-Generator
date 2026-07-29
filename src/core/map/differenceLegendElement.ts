import type {
  DifferenceLegendElementStyle,
  MapElementPositions,
} from '../types'
import { differenceBandCount, differenceColor } from './hydraulicLayers'
import { anchorBox, drawElementBox } from './mapElementLayout'
import type { MapFrame } from './view'

function formatLegendValue(value: number, decimalPlaces: number) {
  return value.toFixed(Math.max(0, Math.min(3, decimalPlaces)))
}

function legendTitle(style: DifferenceLegendElementStyle) {
  const title = style.title.trim()
  const units = style.units.trim()
  return units ? `${title} (${units})` : title
}

export function drawDifferenceLegend(
  context: CanvasRenderingContext2D,
  maxAbsolute: number,
  interval: number | null,
  frame: MapFrame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const bandCount = differenceBandCount(maxAbsolute, interval)
  const padding = 12
  const title = legendTitle(style)
  const labels = Array.from({ length: bandCount + 1 }, (_, index) =>
    formatLegendValue(
      -maxAbsolute + (index * 2 * maxAbsolute) / bandCount,
      style.decimalPlaces,
    ),
  )
  const titleHeight = style.fontSize + 14
  context.save()
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    ...labels.map((label) => context.measureText(label).width),
  )

  let width: number
  let height: number
  if (style.orientation === 'horizontal') {
    const blockWidth = Math.max(style.swatchSize * 2, labelWidth + 36)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + blockWidth * bandCount,
    )
    height = padding * 2 + titleHeight + style.swatchSize + style.fontSize + 14
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    width = Math.max(
      padding * 2 + titleWidth,
      padding * 2 + swatchWidth + 12 + labelWidth,
    )
    height =
      padding * 2 +
      titleHeight +
      bandCount * blockHeight +
      style.fontSize / 2
  }

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
  context.fillText(title, x + padding, y + padding)

  const barX = x + padding
  const barTop = y + padding + titleHeight
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.strokeStyle = style.borderColor
  context.fillStyle = style.textColor
  if (style.orientation === 'horizontal') {
    const blockWidth = (width - padding * 2) / bandCount
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
      context.fillRect(
        barX + band * blockWidth,
        barTop,
        blockWidth,
        style.swatchSize,
      )
    }
    context.strokeRect(
      barX + 0.5,
      barTop + 0.5,
      width - padding * 2,
      style.swatchSize,
    )
    context.fillStyle = style.textColor
    context.textBaseline = 'top'
    labels.forEach((label, index) => {
      const labelX = barX + (index * (width - padding * 2)) / bandCount
      context.textAlign =
        index === 0 ? 'left' : index === bandCount ? 'right' : 'center'
      context.fillText(label, labelX, barTop + style.swatchSize + 7)
    })
  } else {
    const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
    const swatchWidth = Math.round(style.swatchSize * 1.7)
    const barHeight = bandCount * blockHeight
    const barBottom = barTop + barHeight
    for (let band = 0; band < bandCount; band += 1) {
      const middle =
        -maxAbsolute + ((band + 0.5) * 2 * maxAbsolute) / bandCount
      context.fillStyle = differenceColor(middle, maxAbsolute) ?? '#fff'
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
    labels.forEach((label, index) => {
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
