import type { RefObject } from 'react'
import type { HydraulicCrossSectionScene, WorkspaceDraftSnapshot } from '../../core/types'
import { createCrossSectionReportFigure } from './crossSectionReportAdapter'
import type { CrossSectionFigureSettings } from './crossSectionSettings'
import { downloadCrossSectionPng } from './exportCrossSection'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  scene: HydraulicCrossSectionScene | null
  settings: CrossSectionFigureSettings
  baselineLabel: string
  comparisonLabel: string
  captureDraft(): WorkspaceDraftSnapshot
}

export function createCrossSectionWorkspaceOutputController({
  canvasRef,
  scene,
  settings,
  baselineLabel,
  comparisonLabel,
  captureDraft,
}: Options) {
  const download = () => {
    if (scene) downloadCrossSectionPng(scene, settings)
  }
  const createExportFigure = () => {
    if (!scene || !canvasRef.current) return null
    return createCrossSectionReportFigure(
      canvasRef.current,
      scene,
      baselineLabel,
      comparisonLabel,
      captureDraft(),
    )
  }
  return { download, createExportFigure }
}
