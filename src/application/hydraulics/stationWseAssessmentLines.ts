import { stationAssessmentLines } from '../../core/centerlineStationing'
import type {
  AssessmentLineOverride,
  CenterlineCandidate,
  CenterlineDirection,
  WseAssessmentLine,
} from '../../core/types'

export type StationWseAssessmentLinesRequest = {
  lines: WseAssessmentLine[]
  centerline: CenterlineCandidate
  direction: CenterlineDirection
  startStation: number
  overrides: Record<string, AssessmentLineOverride>
}

export function stationWseAssessmentLines(
  request: StationWseAssessmentLinesRequest,
) {
  return stationAssessmentLines(
    request.lines,
    request.centerline,
    request.direction,
    request.startStation,
    request.overrides,
  )
}
