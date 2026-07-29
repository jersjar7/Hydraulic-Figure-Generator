import type { MapElementPositions, NorthElementStyle } from '../types'
import { anchorBox } from './mapElementLayout'
import type { MapFrame } from './view'

export function drawNorthArrow(
  context: CanvasRenderingContext2D,
  frame: MapFrame,
  rotationRadians: number,
  position: MapElementPositions['north'],
  style: NorthElementStyle,
) {
  const diameter = style.size
  const radius = diameter / 2
  const [x, y] = anchorBox(
    position.anchor,
    diameter,
    diameter,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'north', x, y, width: diameter, height: diameter } as const
  const centerX = x + radius
  const centerY = y + radius
  const rotation =
    style.rotationMode === 'true-north' ? rotationRadians : 0
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  if (style.background) {
    context.globalAlpha = Math.max(0, Math.min(1, style.backgroundOpacity))
    context.fillStyle = style.backgroundColor
    context.fill()
    context.globalAlpha = 1
  }
  if (style.borderWidth > 0) {
    context.lineWidth = style.borderWidth
    context.strokeStyle = style.borderColor
    context.stroke()
  }
  context.translate(centerX, centerY)
  context.rotate(rotation)
  context.fillStyle = style.color
  context.strokeStyle = style.color
  context.lineWidth = Math.max(2, diameter * 0.035)
  if (style.style === 'simple') {
    context.beginPath()
    context.moveTo(0, radius * 0.48)
    context.lineTo(0, -radius * 0.45)
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.18, -radius * 0.28)
    context.lineTo(0, -radius * 0.36)
    context.lineTo(-radius * 0.18, -radius * 0.28)
    context.closePath()
    context.fill()
  } else if (style.style === 'compass') {
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, radius * 0.5)
    context.lineTo(-radius * 0.16, 0)
    context.closePath()
    context.stroke()
    context.beginPath()
    context.moveTo(0, -radius * 0.62)
    context.lineTo(radius * 0.16, 0)
    context.lineTo(0, -radius * 0.08)
    context.closePath()
    context.fill()
    context.beginPath()
    context.moveTo(-radius * 0.48, 0)
    context.lineTo(radius * 0.48, 0)
    context.stroke()
  } else {
    context.beginPath()
    context.moveTo(0, -radius * 0.55)
    context.lineTo(radius * 0.34, radius * 0.5)
    context.lineTo(0, radius * 0.24)
    context.lineTo(-radius * 0.34, radius * 0.5)
    context.closePath()
    context.fill()
  }
  context.restore()

  if (style.showLabel) {
    const labelRadius = radius * 0.75
    const labelX = centerX + Math.sin(rotation) * labelRadius
    const labelY = centerY - Math.cos(rotation) * labelRadius
    context.save()
    context.fillStyle = style.color
    context.font = `700 ${Math.max(12, diameter * 0.2)}px "Segoe UI", Arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('N', labelX, labelY)
    context.restore()
  }
  return bounds
}
