import { useCallback, useMemo, useState } from 'react'
import {
  addReportFigure,
  createReportAssemblyDocument,
  createReportFigure,
  flattenReportFigures,
  moveReportFigure,
  moveReportFigureBy,
  moveReportWorkspace,
  moveReportWorkspaceBy,
  removeReportFigure,
  replaceReportFigure,
  updateReportFigure,
} from '../../application/report-assembly/reportAssembly'
import type {
  NewReportFigure,
  ReportAssemblyDocument,
} from '../../core/types'

export function useReportAssembly() {
  const [document, setDocument] = useState(createReportAssemblyDocument)

  const addFigure = useCallback((input: NewReportFigure) => {
    const figure = createReportFigure(input)
    setDocument((current) => addReportFigure(current, figure))
    return figure
  }, [])

  return {
    document,
    figureCount: useMemo(() => flattenReportFigures(document).length, [document]),
    addFigure,
    removeFigure: useCallback((figureId: string) =>
      setDocument((current) => removeReportFigure(current, figureId)), []),
    replaceFigure: useCallback((figure: ReturnType<typeof createReportFigure>) =>
      setDocument((current) => replaceReportFigure(current, figure)), []),
    updateFigure: useCallback((figureId: string, update: { title?: string; caption?: string }) =>
      setDocument((current) => updateReportFigure(current, figureId, update)), []),
    moveFigure: useCallback((workspaceId: string, sourceId: string, targetId: string) =>
      setDocument((current) => moveReportFigure(current, workspaceId, sourceId, targetId)), []),
    moveFigureBy: useCallback((workspaceId: string, figureId: string, delta: number) =>
      setDocument((current) => moveReportFigureBy(current, workspaceId, figureId, delta)), []),
    moveWorkspace: useCallback((sourceId: string, targetId: string) =>
      setDocument((current) => moveReportWorkspace(current, sourceId, targetId)), []),
    moveWorkspaceBy: useCallback((workspaceId: string, delta: number) =>
      setDocument((current) => moveReportWorkspaceBy(current, workspaceId, delta)), []),
    load: useCallback((next: ReportAssemblyDocument) => setDocument(next), []),
    clear: useCallback(() => setDocument(createReportAssemblyDocument()), []),
    setTitle: useCallback((title: string) =>
      setDocument((current) => ({ ...current, title })), []),
  }
}
