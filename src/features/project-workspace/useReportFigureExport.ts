import { useCallback, useMemo } from 'react'
import {
  createReplacementReportFigure,
} from '../../application/report-assembly/reportAssembly'
import {
  resolveReportFigureEditTarget,
} from '../../application/report-assembly/reportFigureEditSession'
import type { NewReportFigure } from '../../core/types'
import type { FigureId } from '../figures/workspaceRegistry'
import { useHydraulicProjectWorkspace } from './useHydraulicProjectWorkspace'

function assertWorkspace(input: NewReportFigure, workspaceId: FigureId) {
  if (input.workspaceId !== workspaceId) {
    throw new Error('The exported figure does not belong to the active workspace.')
  }
}

export function useReportFigureExport(workspaceId: FigureId) {
  const {
    reportAssembly,
    reportFigureEditTargets,
    linkReportFigureEditTarget,
    unlinkReportFigureEditTarget,
  } = useHydraulicProjectWorkspace()
  const target = useMemo(() => resolveReportFigureEditTarget(
    reportAssembly.document,
    reportFigureEditTargets,
    workspaceId,
  ), [reportAssembly.document, reportFigureEditTargets, workspaceId])

  const saveAsNew = useCallback((input: NewReportFigure) => {
    assertWorkspace(input, workspaceId)
    const figure = reportAssembly.addFigure(input)
    linkReportFigureEditTarget(figure)
    return figure
  }, [linkReportFigureEditTarget, reportAssembly, workspaceId])

  const update = useCallback((input: NewReportFigure) => {
    assertWorkspace(input, workspaceId)
    if (!target) {
      throw new Error('The exported figure is no longer available to update.')
    }
    const figure = createReplacementReportFigure(target, input)
    reportAssembly.replaceFigure(figure)
    return figure
  }, [reportAssembly, target, workspaceId])

  return {
    target,
    saveAsNew,
    update,
    unlink: useCallback(
      () => unlinkReportFigureEditTarget(workspaceId),
      [unlinkReportFigureEditTarget, workspaceId],
    ),
  }
}
