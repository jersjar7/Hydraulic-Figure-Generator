import {
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import type { WorkspaceDraftModule } from '../figures/workspaceDraftModule'
import { useHydraulicProjectWorkspace } from './useHydraulicProjectWorkspace'

type Options<WorkspaceId extends string, Draft> = {
  module: WorkspaceDraftModule<WorkspaceId, Draft>
  snapshot: Draft
  hydrate(draft: Draft): void
  onRestoreError?(error: Error): void
}

export function useWorkspaceDraftRetention<
  WorkspaceId extends string,
  Draft,
>({
  module,
  snapshot,
  hydrate,
  onRestoreError,
}: Options<WorkspaceId, Draft>) {
  const { workspaceDrafts } = useHydraulicProjectWorkspace()
  const snapshotRef = useRef(snapshot)
  const hydrateRef = useRef(hydrate)
  const restoreErrorRef = useRef(onRestoreError)
  const setupRevisionRef = useRef(0)
  const restoredRef = useRef(false)
  snapshotRef.current = snapshot
  hydrateRef.current = hydrate
  restoreErrorRef.current = onRestoreError

  const capture = useCallback(() => {
    workspaceDrafts.capture(module, snapshotRef.current)
  }, [module, workspaceDrafts])

  useLayoutEffect(() => {
    const setupRevision = setupRevisionRef.current + 1
    setupRevisionRef.current = setupRevision
    try {
      if (!restoredRef.current) {
        const restored = workspaceDrafts.restore(module)
        if (restored) {
          restoredRef.current = true
          snapshotRef.current = restored
          hydrateRef.current(restored)
        }
      }
    } catch (caught) {
      workspaceDrafts.remove(module.workspaceId)
      restoreErrorRef.current?.(
        caught instanceof Error ? caught : new Error(String(caught)),
      )
    }

    return () => {
      // Strict Mode immediately replays effects in development. Deferring the
      // capture lets the next setup cancel that simulated unmount while real
      // workspace navigation still records the latest committed snapshot.
      queueMicrotask(() => {
        if (setupRevisionRef.current === setupRevision) capture()
      })
    }
  }, [capture, module, workspaceDrafts])

  return { capture }
}
