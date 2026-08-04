import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { exportFigureDocument } from '../../application/documents/exportFigureDocument'
import type { WordDocumentImage } from '../../application/ports/wordDocument'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import {
  createDefaultFigureDocumentSettings,
  type FigureDocumentSettings,
  type IngestNotice,
  type MapOverlay,
} from '../../core/types'
import { browserBinaryFilePort } from '../../infrastructure/browser/browserBinaryFilePort'
import {
  buildPlanViewFigureDocumentPages,
  figureDocumentFileName,
} from './planViewFigureDocument'
import { renderPlanViewFigureSetCanvas } from './planViewFigureSetRecipe'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'

type Options = {
  engine: HydraulicEngine
  overlays: MapOverlay[]
  figureSet: ReturnType<typeof usePlanViewFigureSet>
  appendNotices(notices: IngestNotice[]): void
}

function canvasPng(canvas: HTMLCanvasElement): Promise<WordDocumentImage> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('The browser could not encode a report figure.'))
        return
      }
      resolve({
        data: new Uint8Array(await blob.arrayBuffer()),
        widthPx: canvas.width,
        heightPx: canvas.height,
      })
    }, 'image/png')
  })
}

export function usePlanViewFigureDocument({
  engine,
  overlays,
  figureSet,
  appendNotices,
}: Options) {
  const [settings, setSettings] = useState(createDefaultFigureDocumentSettings)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const abortRef = useRef<AbortController | null>(null)
  const pages = useMemo(() => buildPlanViewFigureDocumentPages(
    figureSet.figureSet,
    figureSet.runtime,
    settings,
  ), [figureSet.figureSet, figureSet.runtime, settings])

  useEffect(() => {
    if (pages.some((page) => page.id === selectedPageId)) return
    setSelectedPageId(pages[0]?.id ?? null)
  }, [pages, selectedPageId])

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null
  const updateSettings = useCallback(<Key extends keyof FigureDocumentSettings>(
    key: Key,
    value: FigureDocumentSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }, [])

  const exportWord = useCallback(async () => {
    const included = figureSet.figureSet.items.filter((item) => item.included)
    if (included.length === 0 || exporting) return
    const controller = new AbortController()
    abortRef.current = controller
    setExporting(true)
    setProgress({ completed: 0, total: included.length })
    try {
      const { docxWordDocumentPort } = await import(
        '../../infrastructure/documents/docxWordDocumentPort'
      )
      const result = await exportFigureDocument({
        items: included,
        settings,
        fileName: figureDocumentFileName(figureSet.figureSet.name),
        signal: controller.signal,
        render: async (item, signal) => {
          const { canvas } = await renderPlanViewFigureSetCanvas(
            { engine, overlays },
            item,
            signal,
          )
          return canvasPng(canvas)
        },
        writer: docxWordDocumentPort,
        files: browserBinaryFilePort,
        onProgress: (completed, total) => setProgress({ completed, total }),
      })
      appendNotices([{
        level: 'success',
        text: `Exported ${result.pageCount} figures to Word.`,
      }])
    } catch (error) {
      const cancelled = error instanceof DOMException && error.name === 'AbortError'
      appendNotices([{
        level: cancelled ? 'warning' : 'error',
        text: cancelled
          ? 'Word export cancelled.'
          : `Word export failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
    } finally {
      setExporting(false)
      abortRef.current = null
    }
  }, [appendNotices, engine, exporting, figureSet.figureSet, overlays, settings])

  const load = useCallback((next?: FigureDocumentSettings) => {
    setSettings(next ?? createDefaultFigureDocumentSettings())
    setSelectedPageId(null)
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setSettings(createDefaultFigureDocumentSettings())
    setSelectedPageId(null)
    setExporting(false)
    setProgress({ completed: 0, total: 0 })
  }, [])

  return {
    settings,
    pages,
    selectedPage,
    selectedPageId,
    exporting,
    progress,
    updateSettings,
    setSelectedPageId,
    updateCaption: figureSet.updateCaption,
    toggleIncluded: figureSet.toggleIncluded,
    moveItem: figureSet.moveItem,
    exportWord,
    cancelExport: () => abortRef.current?.abort(),
    load,
    reset,
  }
}
