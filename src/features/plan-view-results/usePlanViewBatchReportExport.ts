import { useCallback, useMemo, useRef, useState } from 'react'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type {
  IngestNotice,
  MapOverlay,
  WorkspaceDraftSnapshot,
} from '../../core/types'
import { createCanvasReportFigure } from '../figures/canvasReportFigure'
import type { HydraulicProjectWorkspaceValue } from '../project-workspace/hydraulicProjectWorkspaceContext'
import type { CenterlineStationingSource } from '../stationing/centerlineStationingSource'
import type { PlanViewFigureSetItem } from './planViewFigureSet'
import { renderPlanViewFigureSetCanvas } from './planViewFigureSetRecipe'
import { planViewResultFigure } from './planViewResultFigure'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Options = {
  engine: HydraulicEngine
  overlays: MapOverlay[]
  stationingSource?: CenterlineStationingSource
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  addFigure: HydraulicProjectWorkspaceValue['reportAssembly']['addFigure']
  createDraft(item: PlanViewFigureSetItem): WorkspaceDraftSnapshot
  appendNotices(notices: IngestNotice[]): void
}

export function usePlanViewBatchReportExport({
  engine,
  overlays,
  stationingSource,
  figureSet,
  addFigure,
  createDraft,
  appendNotices,
}: Options) {
  const [adding, setAdding] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const abortRef = useRef<AbortController | null>(null)
  const includedItems = useMemo(
    () => figureSet.figureSet.items.filter((item) => item.included),
    [figureSet.figureSet.items],
  )

  const addIncluded = useCallback(async () => {
    if (adding || includedItems.length === 0) return
    const controller = new AbortController()
    abortRef.current = controller
    setAdding(true)
    setProgress({ completed: 0, total: includedItems.length })
    let completed = 0
    try {
      for (const item of includedItems) {
        const { canvas } = await renderPlanViewFigureSetCanvas(
          { engine, overlays, stationingSource },
          item,
          controller.signal,
        )
        addFigure(createCanvasReportFigure(canvas, {
          workspaceId: planViewResultFigure.id,
          workspaceLabel: planViewResultFigure.label,
          title: item.title,
          caption: item.caption || item.title,
          workspaceDraft: createDraft(item),
        }))
        completed += 1
        setProgress({ completed, total: includedItems.length })
      }
      appendNotices([{
        level: 'success',
        text: `${completed} batch figure${completed === 1 ? '' : 's'} added to the Export Collection.`,
      }])
    } catch (caught) {
      const cancelled = caught instanceof DOMException && caught.name === 'AbortError'
      appendNotices([{
        level: cancelled ? 'warning' : 'error',
        text: cancelled
          ? `Batch export cancelled after ${completed} figure${completed === 1 ? '' : 's'}.`
          : `Batch export stopped after ${completed} figure${completed === 1 ? '' : 's'}: ${caught instanceof Error ? caught.message : String(caught)}`,
      }])
    } finally {
      abortRef.current = null
      setAdding(false)
    }
  }, [
    addFigure,
    adding,
    appendNotices,
    createDraft,
    engine,
    includedItems,
    overlays,
    stationingSource,
  ])

  return {
    includedCount: includedItems.length,
    adding,
    progress,
    addIncluded,
    cancel: () => abortRef.current?.abort(),
  }
}
