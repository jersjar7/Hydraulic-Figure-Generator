import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  MapInteractionTool,
  MapPointerInput,
} from './mapInteraction'
import { MapInteractionRuntime } from './mapInteractionRuntime'

type CanvasPointerEvent = ReactPointerEvent<HTMLCanvasElement>

type Options = {
  enabled: boolean
  tools(): readonly MapInteractionTool[]
  pointerInput(event: CanvasPointerEvent): MapPointerInput
  onReset?(): void
}

function releasePointer(event: CanvasPointerEvent) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
}

export function useCanvasInteractionRuntime(options: Options) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const runtimeRef = useRef<MapInteractionRuntime | null>(null)
  if (!runtimeRef.current) {
    runtimeRef.current = new MapInteractionRuntime(
      () => optionsRef.current.tools(),
    )
  }

  const handlePointerDown = useCallback((event: CanvasPointerEvent) => {
    if (!optionsRef.current.enabled) return
    event.preventDefault()
    const result = runtimeRef.current?.begin(
      optionsRef.current.pointerInput(event),
    )
    if (result?.capturePointer) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }, [])

  const handlePointerMove = useCallback((event: CanvasPointerEvent) => {
    if (!optionsRef.current.enabled) return
    runtimeRef.current?.move(optionsRef.current.pointerInput(event))
  }, [])

  const handlePointerUp = useCallback((event: CanvasPointerEvent) => {
    if (!optionsRef.current.enabled) return
    const finished = runtimeRef.current?.finish(
      optionsRef.current.pointerInput(event),
    )
    if (finished) releasePointer(event)
  }, [])

  const handlePointerCancel = useCallback((event: CanvasPointerEvent) => {
    runtimeRef.current?.cancel()
    releasePointer(event)
  }, [])

  const resetInteractions = useCallback(() => {
    runtimeRef.current?.reset()
    optionsRef.current.onReset?.()
  }, [])

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetInteractions,
  }
}
