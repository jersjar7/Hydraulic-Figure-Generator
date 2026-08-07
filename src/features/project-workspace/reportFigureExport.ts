import type { ReportFigureArtifact } from '../../core/types'

export type ReportFigureSaveAction = 'added' | 'updated' | 'duplicated'

export function reportFigureSaveMessage(
  figure: Pick<ReportFigureArtifact, 'title'>,
  action: ReportFigureSaveAction,
) {
  return action === 'updated'
    ? `${figure.title} was updated in the Export Collection.`
    : `${figure.title} was added to the Export Collection.`
}
