import { ControlSection } from '../../components/ControlSection'
import type {
  CenterlineCandidate,
  CenterlineDirection,
  ConditionData,
  ConditionKey,
  FigureSettings,
  RunSelection,
  StationedAssessmentLineCollection,
  WseAssessmentLineCollection,
} from '../../core/types'
import type { FigureSettingsChange } from '../wse-difference/settingsPanelTypes'
import { AssessmentLineAppearancePanel } from './AssessmentLineAppearancePanel'
import { AssessmentLineReviewToolView } from './AssessmentLineReviewToolView'
import { AssessmentLineSourcePanel } from './AssessmentLineSourcePanel'
import { AssessmentLineStationingPanel } from './AssessmentLineStationingPanel'
import type { useAssessmentWorkflow } from './useAssessmentWorkflow'

export type AssessmentLinesToolPanelProps = {
  busy: boolean
  scenarios: ConditionData[]
  sourceId: ConditionKey
  sourceRun: number
  sourceRuns: RunSelection[]
  collection: WseAssessmentLineCollection
  stationed: StationedAssessmentLineCollection | null
  workflow: ReturnType<typeof useAssessmentWorkflow>
  settings: FigureSettings
  centerlineCandidates: CenterlineCandidate[]
  centerlineId: string
  centerlineDirection: CenterlineDirection
  startStation: number
  onSourceChange(id: ConditionKey): void
  onSourceRunChange(index: number): void
  onIntervalChange(interval: number): void
  onGenerate(): void
  onClear(): void
  onSettingsChange: FigureSettingsChange
  onCenterlineChange(id: string): void
  onCenterlineDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
}

export function AssessmentLinesToolPanel({
  busy,
  scenarios,
  sourceId,
  sourceRun,
  sourceRuns,
  collection,
  stationed,
  workflow,
  settings,
  centerlineCandidates,
  centerlineId,
  centerlineDirection,
  startStation,
  onSourceChange,
  onSourceRunChange,
  onIntervalChange,
  onGenerate,
  onClear,
  onSettingsChange,
  onCenterlineChange,
  onCenterlineDirectionChange,
  onStartStationChange,
}: AssessmentLinesToolPanelProps) {
  const generated = collection.lines.length > 0

  if (workflow.state.panelView === 'review') {
    return (
      <ControlSection>
        <AssessmentLineReviewToolView
          workflow={workflow}
          stationed={stationed}
        />
      </ControlSection>
    )
  }

  return (
    <ControlSection>
      <AssessmentLineSourcePanel
        busy={busy}
        scenarios={scenarios}
        sourceId={sourceId}
        sourceRun={sourceRun}
        sourceRuns={sourceRuns}
        collection={collection}
        onSourceChange={onSourceChange}
        onSourceRunChange={onSourceRunChange}
        onIntervalChange={onIntervalChange}
        onGenerate={onGenerate}
        onClear={onClear}
      />
      {generated ? (
        <>
          <AssessmentLineAppearancePanel
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
          <AssessmentLineStationingPanel
            candidates={centerlineCandidates}
            centerlineId={centerlineId}
            direction={centerlineDirection}
            startStation={startStation}
            stationed={stationed}
            onCenterlineChange={onCenterlineChange}
            onDirectionChange={onCenterlineDirectionChange}
            onStartStationChange={onStartStationChange}
            onReview={workflow.openReview}
          />
        </>
      ) : null}
    </ControlSection>
  )
}
