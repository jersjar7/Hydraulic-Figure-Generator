import type { FigureSetRecipe } from '../../application/figure-sets/figureSetRecipe'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import type { MapOverlay, PlanViewResultScene } from '../../core/types'
import { planViewResultFigure } from './planViewResultFigure'
import {
  expandPlanViewFigureSet,
  PLAN_VIEW_FIGURE_SET_RECIPE_ID,
  type PlanViewFigureSetItem,
  type PlanViewFigureSetScope,
  type PlanViewFigureSetSelection,
} from './planViewFigureSet'
import type { PlanViewResultSettings } from '../../core/types'

export type PlanViewFigureSetContext = {
  engine: HydraulicEngine
  overlays: MapOverlay[]
}

function thumbnail(canvas: HTMLCanvasElement) {
  const output = document.createElement('canvas')
  output.width = 720
  output.height = Math.round((canvas.height / canvas.width) * output.width)
  const context = output.getContext('2d')
  if (!context) throw new Error('This browser could not create a preview canvas.')
  context.drawImage(canvas, 0, 0, output.width, output.height)
  return output.toDataURL('image/jpeg', 0.82)
}

export async function renderPlanViewFigureSetCanvas(
  { engine, overlays }: PlanViewFigureSetContext,
  item: PlanViewFigureSetItem,
  signal?: AbortSignal,
) {
  const scene = planViewResultFigure.buildScene({
    engine,
    ...item.selection,
  })
  const canvas = document.createElement('canvas')
  await planViewResultFigure.render({
    canvas,
    document: {
      scene,
      view: {
        bounds: engine.commonBounds([item.selection.scenarioId]),
        settings: item.settings,
      },
      layers: { overlays },
      selection: {},
    },
    signal,
  })
  return { scene, canvas }
}

export const planViewFigureSetRecipe: FigureSetRecipe<
  PlanViewFigureSetScope & { engine: HydraulicEngine },
  PlanViewFigureSetSelection,
  PlanViewResultSettings,
  PlanViewFigureSetContext,
  PlanViewResultScene
> = {
  id: PLAN_VIEW_FIGURE_SET_RECIPE_ID,
  figureId: planViewResultFigure.id,
  label: 'Plan-View Hydraulic Results',
  expand: ({ engine, ...scope }, baseSettings) =>
    expandPlanViewFigureSet(engine, scope, baseSettings),
  generate: async (context, item, signal) => {
    const { scene, canvas } = await renderPlanViewFigureSetCanvas(
      context,
      item,
      signal,
    )
    return { scene, thumbnailUrl: thumbnail(canvas) }
  },
}

export function updatePlanViewFigureSetItem(
  item: PlanViewFigureSetItem,
  changes: Partial<Pick<PlanViewFigureSetItem, 'caption' | 'included' | 'settings'>>,
) {
  return { ...item, ...changes }
}
