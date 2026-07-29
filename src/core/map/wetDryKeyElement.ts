import type {
  FigureSettings,
  MapElementPositions,
  WetDryElementStyle,
} from '../types'
import { anchorBox, drawElementBox } from './mapElementLayout'
import type { MapFrame } from './view'

export function drawWetDryKey(
  context: CanvasRenderingContext2D,
  frame: MapFrame,
  settings: FigureSettings,
  position: MapElementPositions['wetDry'],
  style: WetDryElementStyle,
) {
  const padding = 12
  const swatchHeight = Math.max(10, Math.round(style.swatchSize * 0.55))
  const rows = [
    [style.wetLabel, settings.newlyWetColor],
    [style.dryLabel, settings.newlyDryColor],
  ] as const
  context.save()
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  const titleWidth = context.measureText(style.title).width
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const itemWidths = rows.map(
    ([label]) =>
      style.swatchSize + 10 + context.measureText(label).width,
  )
  const titleHeight = style.fontSize + 14
  const width =
    style.orientation === 'horizontal'
      ? Math.max(
          titleWidth + padding * 2,
          itemWidths.reduce((total, value) => total + value, 0) +
            padding * 2 +
            20,
        )
      : Math.max(titleWidth, ...itemWidths) + padding * 2
  const height =
    style.orientation === 'horizontal'
      ? padding * 2 + titleHeight + Math.max(style.fontSize, swatchHeight)
      : padding * 2 + titleHeight + rows.length * (style.fontSize + 8)
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'wetDry', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = `700 ${style.fontSize + 1}px "Segoe UI", Arial, sans-serif`
  context.fillText(style.title, x + padding, y + padding)
  context.font = `${style.fontSize}px "Segoe UI", Arial, sans-serif`
  let rowX = x + padding
  rows.forEach(([label, color], index) => {
    const rowY =
      y +
      padding +
      titleHeight +
      (style.orientation === 'vertical' ? index * (style.fontSize + 8) : 0)
    context.fillStyle = color
    context.fillRect(rowX, rowY, style.swatchSize, swatchHeight)
    context.fillStyle = style.textColor
    context.fillText(
      label,
      rowX + style.swatchSize + 10,
      rowY + (swatchHeight - style.fontSize) / 2,
    )
    if (style.orientation === 'horizontal') {
      rowX += itemWidths[index] + 20
    }
  })
  context.restore()
  return bounds
}
