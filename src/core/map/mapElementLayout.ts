import type {
  Anchor,
  ElementBoxStyle,
  MapElementBounds,
} from '../types'
import { roundedRectangle } from './drawingPrimitives'
import type { MapFrame } from './view'

export function anchorBox(
  anchor: Anchor,
  width: number,
  height: number,
  frame: MapFrame,
  margin: number,
  offX: number,
  offY: number,
) {
  const x = {
    l: margin,
    c: (frame.width - width) / 2,
    r: frame.width - width - margin,
  }
  const y = {
    t: margin,
    m: (frame.height - height) / 2,
    b: frame.height - height - margin,
  }
  const rawX =
    anchor === 'ml'
      ? margin + offX
      : anchor === 'mr'
        ? x.r + offX
        : x[anchor[1] as keyof typeof x] + offX
  const rawY =
    anchor === 'ml' || anchor === 'mr'
      ? y.m + offY
      : y[anchor[0] as keyof typeof y] + offY
  return [
    Math.max(0, Math.min(frame.width - width, rawX)),
    Math.max(0, Math.min(frame.height - height, rawY)),
  ] as const
}

export function drawElementBox(
  context: CanvasRenderingContext2D,
  bounds: Omit<MapElementBounds, 'key'>,
  style: ElementBoxStyle,
) {
  context.save()
  roundedRectangle(context, bounds.x, bounds.y, bounds.width, bounds.height, 7)
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
  context.restore()
}

export function wrappedLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

export function drawMapElementSelection(
  context: CanvasRenderingContext2D,
  bounds: MapElementBounds,
) {
  context.save()
  context.strokeStyle = '#1682cf'
  context.lineWidth = 2
  context.setLineDash([7, 5])
  context.strokeRect(
    bounds.x - 4,
    bounds.y - 4,
    bounds.width + 8,
    bounds.height + 8,
  )
  context.restore()
}
