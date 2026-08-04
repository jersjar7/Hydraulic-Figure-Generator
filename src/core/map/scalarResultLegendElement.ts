import type {
  DifferenceLegendElementStyle,
  MapElementPositions,
  ScalarRampKey,
} from '../types'
import { scalarRampColor } from './scalarResultRamp'
import { anchorBox, drawElementBox } from './mapElementLayout'
import type { MapFrame } from './view'

type ScalarLegendOptions = {
  minimum: number
  maximum: number
  bandCount: number
  ramp: ScalarRampKey
  title: string
  units: string
}

function label(value: number, decimals: number) {
  return value.toFixed(Math.max(0, Math.min(4, decimals)))
}

export function drawScalarResultLegend(
  context: CanvasRenderingContext2D,
  options: ScalarLegendOptions,
  frame: MapFrame,
  position: MapElementPositions['diffLegend'],
  style: DifferenceLegendElementStyle,
) {
  const padding = 12
  const title = options.units
    ? `${options.title} (${options.units})`
    : options.title
  const labels = Array.from(
    { length: options.bandCount + 1 },
    (_, index) =>
      label(
        options.minimum +
          (index * (options.maximum - options.minimum)) /
            options.bandCount,
        style.decimalPlaces,
      ),
  )
  const titleHeight = style.fontSize + 14
  context.save()
  context.font = `700 ${style.fontSize + 2}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const labelWidth = Math.max(
    ...labels.map((value) => context.measureText(value).width),
  )
  const blockHeight = Math.max(style.swatchSize, style.fontSize + 4)
  const swatchWidth = Math.round(style.swatchSize * 1.7)
  const width = Math.max(
    padding * 2 + titleWidth,
    padding * 2 + swatchWidth + 12 + labelWidth,
  )
  const height =
    padding * 2 +
    titleHeight +
    options.bandCount * blockHeight +
    style.fontSize / 2
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
  const barHeight = options.bandCount * blockHeight
  const barBottom = barTop + barHeight
  for (let band = 0; band < options.bandCount; band += 1) {
    context.fillStyle = scalarRampColor(
      options.ramp,
      (band + 0.5) / options.bandCount,
    )
    context.fillRect(
      barX,
      barBottom - (band + 1) * blockHeight,
      swatchWidth,
      blockHeight,
    )
  }
  context.strokeStyle = style.borderColor
  context.strokeRect(barX + 0.5, barTop + 0.5, swatchWidth, barHeight)
  context.fillStyle = style.textColor
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  labels.forEach((value, index) => {
    const labelY = barBottom - index * blockHeight
    context.beginPath()
    context.moveTo(barX + swatchWidth, labelY)
    context.lineTo(barX + swatchWidth + 5, labelY)
    context.stroke()
    context.fillText(value, barX + swatchWidth + 9, labelY)
  })
  context.restore()
  return bounds
}
