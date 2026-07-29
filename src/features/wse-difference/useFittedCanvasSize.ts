import { useEffect, useState, type RefObject } from 'react'
import type { FigureSettings } from '../../core/types'
import { FRAME_ASPECTS } from './workspaceConfiguration'

type CanvasDisplaySize = {
  width: number
  height: number
}

export function useFittedCanvasSize(
  frameRef: RefObject<HTMLDivElement | null>,
  orientation: FigureSettings['orientation'],
) {
  const [displaySize, setDisplaySize] = useState<CanvasDisplaySize>({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const fitCanvas = () => {
      const { width, height } = frame.getBoundingClientRect()
      const aspect = FRAME_ASPECTS[orientation]
      const fittedWidth = Math.min(width, height * aspect)
      const fittedHeight = fittedWidth / aspect

      setDisplaySize((current) =>
        Math.abs(current.width - fittedWidth) < 0.5 &&
        Math.abs(current.height - fittedHeight) < 0.5
          ? current
          : { width: fittedWidth, height: fittedHeight },
      )
    }

    const observer = new ResizeObserver(fitCanvas)
    observer.observe(frame)
    fitCanvas()

    return () => observer.disconnect()
  }, [frameRef, orientation])

  return displaySize
}
