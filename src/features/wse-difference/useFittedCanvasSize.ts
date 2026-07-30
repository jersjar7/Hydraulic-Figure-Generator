import type { RefObject } from 'react'
import type { FigureSettings } from '../../core/types'
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { FRAME_ASPECTS } from './workspaceConfiguration'

export function useFittedCanvasSize(
  frameRef: RefObject<HTMLDivElement | null>,
  orientation: FigureSettings['orientation'],
) {
  return useFittedCanvasAspect(
    frameRef,
    FRAME_ASPECTS[orientation],
  )
}
