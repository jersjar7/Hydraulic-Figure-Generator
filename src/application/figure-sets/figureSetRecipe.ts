import type {
  FigureSetItem,
  GeneratedFigure,
} from '../../core/contracts/figureSet'

export type FigureSetRecipe<Scope, Selection, Settings, Context, Scene> = {
  id: string
  figureId: string
  label: string
  expand(
    scope: Scope,
    baseSettings: Settings,
  ): FigureSetItem<Selection, Settings>[]
  generate(
    context: Context,
    item: FigureSetItem<Selection, Settings>,
    signal?: AbortSignal,
  ): Promise<GeneratedFigure<Scene>>
}
