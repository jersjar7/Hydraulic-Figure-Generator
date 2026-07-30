import {
  useEffect,
  useState,
  type RefObject,
} from 'react'

export type CanvasDisplaySize = {
  width: number
  height: number
}

export function useFittedCanvasAspect(
  frameRef: RefObject<HTMLDivElement | null>,
  aspect: number,
  safeMargin = 0,
) {
  const [displaySize, setDisplaySize] = useState<CanvasDisplaySize>({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const fitCanvas = () => {
      const bounds = frame.getBoundingClientRect()
      const availableWidth = Math.max(0, bounds.width - safeMargin * 2)
      const availableHeight = Math.max(0, bounds.height - safeMargin * 2)
      const fittedWidth = Math.min(
        availableWidth,
        availableHeight * aspect,
      )
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
  }, [aspect, frameRef, safeMargin])

  return displaySize
}
