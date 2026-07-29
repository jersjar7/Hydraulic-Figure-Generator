import type { MapElementPositions, ScaleElementStyle } from '../types'
import { anchorBox, drawElementBox } from './mapElementLayout'
import type { MapFrame } from './view'

function niceScaleValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
    )
}

export function drawScaleBar(
  context: CanvasRenderingContext2D,
  frame: MapFrame,
  feetPerPixel: number,
  position: MapElementPositions['scale'],
  style: ScaleElementStyle,
) {
  const unitFactors = {
    'us-survey-ft': 1,
    ft: 0.3048006096012192 / 0.3048,
    mi: 1 / 5280,
    m: 0.3048006096012192,
  }
  const unitLabels = {
    'us-survey-ft': 'ft (U.S. Survey)',
    ft: 'ft',
    mi: 'mi',
    m: 'm',
  }
  const unitsPerSurveyFoot = unitFactors[style.units]
  const divisions = Math.max(2, Math.min(6, Math.round(style.divisions)))
  const targetUnits = 170 * feetPerPixel * unitsPerSurveyFoot
  const totalUnits =
    style.lengthMode === 'manual'
      ? Math.max(0.0001, style.manualLength)
      : niceScaleValue(targetUnits)
  const totalFeet = totalUnits / unitsPerSurveyFoot
  const totalPixels = totalFeet / feetPerPixel
  const segmentPixels = totalPixels / divisions
  const padding = 12
  const barHeight = Math.max(8, Math.round(style.fontSize * 0.58))
  const width = totalPixels + padding * 2
  const height = barHeight + style.fontSize * 2 + padding * 2 + 14
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'scale', x, y, width, height } as const
  context.save()
  drawElementBox(context, bounds, style)
  const barX = x + padding
  const barY = y + padding
  context.strokeStyle = style.lineColor
  context.lineWidth = 1.5
  if (style.style === 'alternating') {
    for (let segment = 0; segment < divisions; segment += 1) {
      context.fillStyle =
        segment % 2 === 0 ? style.fillColor : style.backgroundColor
      context.fillRect(
        barX + segment * segmentPixels,
        barY,
        segmentPixels,
        barHeight,
      )
    }
    context.strokeRect(barX, barY, totalPixels, barHeight)
  } else {
    context.beginPath()
    context.moveTo(barX, barY + barHeight)
    context.lineTo(barX + totalPixels, barY + barHeight)
    context.stroke()
  }
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  context.fillStyle = style.textColor
  context.textAlign = 'center'
  context.textBaseline = 'top'
  for (let index = 0; index <= divisions; index += 1) {
    const markerX = barX + index * segmentPixels
    context.beginPath()
    context.moveTo(
      markerX,
      style.style === 'ticks' ? barY + barHeight - 5 : barY + barHeight,
    )
    context.lineTo(markerX, barY + barHeight + 5)
    context.stroke()
    context.fillText(
      ((index * totalUnits) / divisions).toFixed(style.decimalPlaces),
      markerX,
      barY + barHeight + 7,
    )
  }
  context.fillText(
    unitLabels[style.units],
    barX + totalPixels / 2,
    barY + barHeight + style.fontSize + 12,
  )
  context.restore()
  return bounds
}
