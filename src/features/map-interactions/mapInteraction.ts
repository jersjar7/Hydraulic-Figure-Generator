import type { MapCoordinate } from '../../core/types'

export type ScreenPoint = {
  x: number
  y: number
}

export type MapPointerInput = {
  screenPoint: ScreenPoint
  mapPoint: MapCoordinate
}

export type MapInteractionSession = {
  id: string
  move?(input: MapPointerInput): void
  finish?(input: MapPointerInput): void
  cancel?(): void
}

export type MapToolResult = {
  handled: true
  capturePointer?: boolean
  session?: MapInteractionSession
}

export type MapInteractionTool = {
  id: string
  begin(input: MapPointerInput): MapToolResult | null
  hover?(input: MapPointerInput): void
}

export type BegunMapInteraction = MapToolResult & {
  toolId: string
}

export function beginMapInteraction(
  tools: readonly MapInteractionTool[],
  input: MapPointerInput,
): BegunMapInteraction | null {
  for (const tool of tools) {
    const result = tool.begin(input)
    if (result) return { ...result, toolId: tool.id }
  }
  return null
}

export function updateMapToolHover(
  tools: readonly MapInteractionTool[],
  input: MapPointerInput,
) {
  for (const tool of tools) tool.hover?.(input)
}
