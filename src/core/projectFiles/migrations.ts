import type {
  ParsedProjectSettings,
  ProjectSettings,
} from './schema'

export function migrateAssessmentLabelSettings(
  parsed: ParsedProjectSettings,
): ProjectSettings {
  const {
    showAssessmentStationLabels,
    assessmentStationLabelColor,
    assessmentStationLabelFontSize,
    assessmentStationLabelOffset,
    assessmentStationLabelSide,
    ...current
  } = parsed
  const migrated: ProjectSettings = { ...current }
  const showLabels =
    current.showAssessmentLabels ?? showAssessmentStationLabels
  const color = current.assessmentLabelColor ?? assessmentStationLabelColor
  const fontSize =
    current.assessmentLabelFontSize ?? assessmentStationLabelFontSize
  const offset = current.assessmentLabelOffset ?? assessmentStationLabelOffset
  const side = current.assessmentLabelSide ?? assessmentStationLabelSide
  if (showLabels !== undefined) migrated.showAssessmentLabels = showLabels
  if (color !== undefined) migrated.assessmentLabelColor = color
  if (fontSize !== undefined) migrated.assessmentLabelFontSize = fontSize
  if (offset !== undefined) migrated.assessmentLabelOffset = offset
  if (side !== undefined) migrated.assessmentLabelSide = side
  return migrated
}
