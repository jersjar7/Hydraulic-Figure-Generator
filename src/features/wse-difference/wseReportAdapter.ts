import type {
  WorkspaceDraftSnapshot,
  WseDifferenceScene,
} from '../../core/types'
import { createCanvasReportFigure } from '../figures/canvasReportFigure'
import { wseDifferenceFigure } from './wseDifferenceFigure'

export function createWseReportFigure(
  canvas: HTMLCanvasElement,
  scene: WseDifferenceScene,
  workspaceDraft: WorkspaceDraftSnapshot,
) {
  const title = `WSE Difference - ${scene.existing.condition.label} vs ${scene.proposed.condition.label}`
  return createCanvasReportFigure(canvas, {
    workspaceId: wseDifferenceFigure.id,
    workspaceLabel: wseDifferenceFigure.label,
    title,
    caption: `${title}, ${scene.proposed.run.name} minus ${scene.existing.run.name}.`,
    workspaceDraft,
  })
}
