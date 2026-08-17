import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

export type CanvasDisplaySize = {
  width: number
  height: number
}

const DEFAULT_SAFE_MARGIN = 16

export function fittedCanvasStyle(
  displaySize: CanvasDisplaySize,
): CSSProperties {
  const ready = displaySize.width > 0 && displaySize.height > 0
  return {
    width: ready ? displaySize.width : 0,
    height: ready ? displaySize.height : 0,
    visibility: ready ? 'visible' : 'hidden',
  }
}

export function useFittedCanvasAspect(
  frameRef: RefObject<HTMLDivElement | null>,
  aspect: number,
  safeMargin = DEFAULT_SAFE_MARGIN,
) {
  const [displaySize, setDisplaySize] = useState<CanvasDisplaySize>({
    width: 0,
    height: 0,
  })

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    let animationFrame = 0
    let settlingFrame = 0

    const fitCanvas = () => {
      const bounds = frame.getBoundingClientRect()
      const availableWidth = Math.max(0, bounds.width - safeMargin * 2)
      const availableHeight = Math.max(0, bounds.height - safeMargin * 2)
      const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
      let fittedWidth = availableWidth
      let fittedHeight = fittedWidth / safeAspect
      if (fittedHeight > availableHeight) {
        fittedHeight = availableHeight
        fittedWidth = fittedHeight * safeAspect
      }

      setDisplaySize((current) =>
        Math.abs(current.width - fittedWidth) < 0.5 &&
        Math.abs(current.height - fittedHeight) < 0.5
          ? current
          : { width: fittedWidth, height: fittedHeight },
      )
    }

    const scheduleFit = () => {
      cancelAnimationFrame(animationFrame)
      cancelAnimationFrame(settlingFrame)
      animationFrame = requestAnimationFrame(() => {
        fitCanvas()
        settlingFrame = requestAnimationFrame(fitCanvas)
      })
    }

    const observer = new ResizeObserver(scheduleFit)
    observer.observe(frame)
    const workspace = frame.closest('.workspace')
    workspace?.addEventListener('transitionrun', scheduleFit)
    workspace?.addEventListener('transitionend', scheduleFit)
    window.addEventListener('resize', scheduleFit)
    window.visualViewport?.addEventListener('resize', scheduleFit)
    scheduleFit()

    return () => {
      observer.disconnect()
      workspace?.removeEventListener('transitionrun', scheduleFit)
      workspace?.removeEventListener('transitionend', scheduleFit)
      window.removeEventListener('resize', scheduleFit)
      window.visualViewport?.removeEventListener('resize', scheduleFit)
      cancelAnimationFrame(animationFrame)
      cancelAnimationFrame(settlingFrame)
    }
  }, [aspect, frameRef, safeMargin])

  return displaySize
}
