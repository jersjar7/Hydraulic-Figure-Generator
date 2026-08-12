import { useMemo, useState } from 'react'
import {
  createProjectCommandController,
  type ProjectCommandNotice,
} from './projectCommandController'
import type { useHydraulicProjectLifecycle } from './useHydraulicProjectLifecycle'

export function useHydraulicProjectCommands(
  lifecycle: ReturnType<typeof useHydraulicProjectLifecycle>,
) {
  const [notice, setNotice] = useState<ProjectCommandNotice | null>(null)
  const controller = useMemo(
    () => createProjectCommandController({ lifecycle, setNotice }),
    [lifecycle],
  )

  return { ...controller, notice }
}
