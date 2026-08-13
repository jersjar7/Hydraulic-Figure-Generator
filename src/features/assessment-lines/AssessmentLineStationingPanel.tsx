import { ListChecks } from 'lucide-react'
import { SettingsGroup } from '../../components/settings/SettingsGroup'
import type {
  CenterlineCandidate,
  CenterlineDirection,
  StationedAssessmentLineCollection,
} from '../../core/types'
import { CenterlineSourceControls } from '../stationing/CenterlineSourceControls'

type Props = {
  candidates: CenterlineCandidate[]
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
  stationed: StationedAssessmentLineCollection | null
  onCenterlineChange(id: string): void
  onDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
  onReview(): void
}

export function AssessmentLineStationingPanel({
  candidates,
  centerlineId,
  direction,
  startStation,
  stationed,
  onCenterlineChange,
  onDirectionChange,
  onStartStationChange,
  onReview,
}: Props) {
  return (
    <SettingsGroup title="Centerline stationing">
      <CenterlineSourceControls
        candidates={candidates}
        centerlineId={centerlineId}
        direction={direction}
        startStation={startStation}
        onCenterlineChange={onCenterlineChange}
        onDirectionChange={onDirectionChange}
        onStartStationChange={onStartStationChange}
      />
      {stationed ? (
        <div className="assessment-status-summary">
          <span>{stationed.includedCount} included</span>
          <span className={stationed.reviewCount > 0 ? 'warning' : 'ready'}>
            {stationed.reviewCount} needs review
          </span>
          <span>{stationed.excludedCount} excluded</span>
        </div>
      ) : null}
      <button
        className="button secondary compact full"
        type="button"
        disabled={!stationed}
        onClick={onReview}
      >
        <ListChecks size={15} aria-hidden="true" />
        Review WSE lines
      </button>
    </SettingsGroup>
  )
}
