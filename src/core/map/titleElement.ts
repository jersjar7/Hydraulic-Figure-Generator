import { runDisplayName } from '../hydraulicEngine'
import type {
  MapElementPositions,
  TitleElementStyle,
  WseDifferenceScene,
} from '../types'
import {
  anchorBox,
  drawElementBox,
  wrappedLines,
} from './mapElementLayout'
import type { MapFrame } from './view'

export function resolveTitle(scene: WseDifferenceScene, template: string) {
  return template
    .replaceAll('{type}', 'WSE Difference Map')
    .replaceAll('{existing}', runDisplayName(scene.existing.run.name))
    .replaceAll('{proposed}', runDisplayName(scene.proposed.run.name))
    .replaceAll('{baseline}', scene.existing.condition.label)
    .replaceAll('{comparison}', scene.proposed.condition.label)
    .replaceAll('{baselineRun}', runDisplayName(scene.existing.run.name))
    .replaceAll('{comparisonRun}', runDisplayName(scene.proposed.run.name))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  frame: MapFrame,
  position: MapElementPositions['title'],
  style: TitleElementStyle,
) {
  const padding = 15
  const lineHeight = Math.round(style.fontSize * 1.22)
  context.save()
  context.font = `${style.fontWeight} ${style.fontSize}px "Segoe UI", Arial, sans-serif`
  const maxTextWidth = Math.max(120, style.maxWidth - padding * 2)
  const lines = wrappedLines(context, title, maxTextWidth)
  const measuredWidth = Math.max(
    1,
    ...lines.map((line) => context.measureText(line).width),
  )
  const width = Math.min(style.maxWidth, measuredWidth + padding * 2)
  const height = lines.length * lineHeight + padding * 2
  const [x, y] = anchorBox(
    position.anchor,
    width,
    height,
    frame,
    18,
    position.offX,
    position.offY,
  )
  const bounds = { key: 'title', x, y, width, height } as const
  drawElementBox(context, bounds, style)
  context.fillStyle = style.textColor
  context.textAlign = style.alignment
  context.textBaseline = 'middle'
  const textX =
    style.alignment === 'left'
      ? x + padding
      : style.alignment === 'right'
        ? x + width - padding
        : x + width / 2
  lines.forEach((line, index) => {
    context.fillText(
      line,
      textX,
      y + padding + lineHeight * (index + 0.5),
      maxTextWidth,
    )
  })
  context.restore()
  return bounds
}
