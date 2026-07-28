import { ListChecks, RefreshCcw, Route, Spline, X } from 'lucide-react'
import type {
  StationedAssessmentLineCollection,
  WseAssessmentLineCollection,
} from '../../core/types'
import {
  AssessmentStationingControls,
  type AssessmentStationingControlsProps,
} from '../../features/assessment-lines/AssessmentStationingControls'

type AssessmentWorkspaceProps = {
  busy: boolean
  hasExistingRuns: boolean
  assessmentLines: WseAssessmentLineCollection
  stationed: StationedAssessmentLineCollection | null
  stationing: AssessmentStationingControlsProps
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onClearAssessmentLines(): void
  onOpenReview(): void
}

export function AssessmentWorkspace({
  busy,
  hasExistingRuns,
  assessmentLines,
  stationed,
  stationing,
  onAssessmentIntervalChange,
  onGenerateAssessmentLines,
  onClearAssessmentLines,
  onOpenReview,
}: AssessmentWorkspaceProps) {
  const generated = assessmentLines.lines.length > 0

  return (
    <>
      <section className="workflow-block assessment-block">
        <div className="block-title">
          <Spline size={17} aria-hidden="true" />
          <span>Existing WSE lines</span>
          <span className="file-chip">WSE</span>
        </div>
        <label className="field">
          <span>Contour interval</span>
          <select
            value={assessmentLines.interval}
            disabled={busy}
            onChange={(event) =>
              onAssessmentIntervalChange(Number(event.target.value))
            }
          >
            <option value="1">Whole foot (1.0 ft)</option>
            <option value="0.5">Half foot (0.5 ft)</option>
          </select>
        </label>
        <button
          className="button secondary compact full"
          type="button"
          disabled={busy || !hasExistingRuns}
          onClick={onGenerateAssessmentLines}
        >
          <RefreshCcw size={15} aria-hidden="true" />
          {generated ? 'Regenerate lines' : 'Generate from Existing WSE'}
        </button>
        {generated ? (
          <div className="assessment-summary">
            <div>
              <strong>
                {assessmentLines.lines.length.toLocaleString()} lines
              </strong>
              <span>
                {assessmentLines.levelCount.toLocaleString()} levels
                {assessmentLines.minimumLevel !== null &&
                assessmentLines.maximumLevel !== null
                  ? ` - ${assessmentLines.minimumLevel.toFixed(1)}-${assessmentLines.maximumLevel.toFixed(1)} ft`
                  : ''}
              </span>
            </div>
            <button
              className="icon-button small danger"
              type="button"
              title="Clear assessment lines"
              aria-label="Clear assessment lines"
              onClick={onClearAssessmentLines}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="empty-note">No assessment lines generated.</p>
        )}
      </section>

      {generated ? (
        <section className="workflow-block stationing-workflow-block">
          <div className="block-title">
            <Route size={17} aria-hidden="true" />
            <span>Centerline stationing</span>
          </div>
          <AssessmentStationingControls {...stationing} />
          {stationed ? (
            <div className="assessment-status-summary">
              <span>{stationed.includedCount} included</span>
              <span
                className={stationed.reviewCount > 0 ? 'warning' : 'ready'}
              >
                {stationed.reviewCount} review
              </span>
              <span>{stationed.excludedCount} excluded</span>
            </div>
          ) : null}
          <button
            className="button secondary compact full assessment-review-button"
            type="button"
            onClick={onOpenReview}
          >
            <ListChecks size={15} aria-hidden="true" />
            Open review
          </button>
        </section>
      ) : null}
    </>
  )
}
