import { hitTestAssessmentCallout } from '../../../core/mapRenderer'
import type {
  AssessmentLineOverride,
  AssessmentMapLayer,
  Bounds,
  FigureSettings,
  StationedAssessmentLineCollection,
} from '../../../core/types'
import type {
  MapInteractionTool,
  MapPointerInput,
} from '../../map-interactions/mapInteraction'
import { assessmentLineAt } from '../workspaceInteractions'

type AssessmentSelection = {
  selectLine(id: string): void
  selectStatus(
    status: 'included' | 'review' | 'excluded',
  ): void
}

type AssessmentCalloutToolOptions = AssessmentSelection & {
  enabled: boolean
  layer: AssessmentMapLayer
  stationed: StationedAssessmentLineCollection | null
  bounds: Bounds
  settings: FigureSettings
  overrides: Record<string, AssessmentLineOverride>
  setOverride(id: string, patch: Partial<AssessmentLineOverride>): void
  setDragging(dragging: boolean): void
  openReview(): void
}

export function createAssessmentCalloutTool({
  enabled,
  layer,
  stationed,
  bounds,
  settings,
  overrides,
  selectLine,
  selectStatus,
  setOverride,
  setDragging,
  openReview,
}: AssessmentCalloutToolOptions): MapInteractionTool {
  return {
    id: 'assessment-callout',
    begin: ({ screenPoint, mapPoint }) => {
      if (!enabled) return null
      const hit = hitTestAssessmentCallout(
        layer,
        bounds,
        settings,
        screenPoint.x,
        screenPoint.y,
      )
      if (!hit) return null

      const originalOverridePoint = overrides[hit.lineId]?.labelPoint
      const stationedItem = stationed?.items.find(
        (item) => item.line.id === hit.lineId,
      )
      if (stationedItem) selectStatus(stationedItem.status)
      selectLine(hit.lineId)

      let moved = false
      const move = (input: MapPointerInput) => {
        if (
          !moved &&
          Math.hypot(
            input.screenPoint.x - screenPoint.x,
            input.screenPoint.y - screenPoint.y,
          ) < 3
        ) {
          return
        }
        moved = true
        setOverride(hit.lineId, {
          labelPoint: {
            x: hit.labelPoint.x + input.mapPoint.x - mapPoint.x,
            y: hit.labelPoint.y + input.mapPoint.y - mapPoint.y,
          },
        })
      }

      setDragging(true)
      return {
        handled: true,
        capturePointer: true,
        session: {
          id: `assessment-callout:${hit.lineId}`,
          move,
          finish: (input) => {
            move(input)
            setDragging(false)
            if (!moved) openReview()
          },
          cancel: () => {
            setOverride(hit.lineId, {
              labelPoint: originalOverridePoint,
            })
            setDragging(false)
          },
        },
      }
    },
  }
}

type AssessmentLineToolOptions = AssessmentSelection & {
  enabled: boolean
  stationed: StationedAssessmentLineCollection | null
  bounds: Bounds
  settings: FigureSettings
}

export function createAssessmentLineTool({
  enabled,
  stationed,
  bounds,
  settings,
  selectLine,
  selectStatus,
}: AssessmentLineToolOptions): MapInteractionTool {
  return {
    id: 'assessment-line',
    begin: ({ screenPoint }) => {
      if (!enabled || !stationed) return null
      const line = assessmentLineAt(
        stationed.items.map((item) => item.line),
        bounds,
        settings,
        screenPoint,
      )
      if (!line) return null
      const item = stationed.items.find(
        (candidate) => candidate.line.id === line.id,
      )
      if (item) selectStatus(item.status)
      selectLine(line.id)
      return { handled: true }
    },
  }
}
