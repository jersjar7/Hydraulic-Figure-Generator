import {
  Check,
  ChevronLeft,
  CircleOff,
  Eye,
  EyeOff,
  RotateCcw,
  Route,
  TriangleAlert,
  X,
} from 'lucide-react'
import { formatStation } from '../../core/centerlineStationing'
import type {
  AssessmentLineOverride,
  AssessmentLineOverrides,
  CenterlineCandidate,
  CenterlineDirection,
  StationedAssessmentLine,
  StationedAssessmentLineCollection,
} from '../../core/types'
import type { AssessmentReviewTab } from './useAssessmentWorkflow'

export type AssessmentLinesReviewPanelProps = {
  candidates: CenterlineCandidate[]
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
  reviewTab: AssessmentReviewTab
  selectedLineId: string | null
  overrides: AssessmentLineOverrides
  stationed: StationedAssessmentLineCollection | null
  onBack(): void
  onMobileClose(): void
  onCenterlineChange(id: string): void
  onDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
  onReviewTabChange(tab: AssessmentReviewTab): void
  onSelectLine(id: string): void
  onSetOverride(id: string, override: AssessmentLineOverride): void
}

const TABS = [
  { key: 'included', label: 'Included', icon: Check },
  { key: 'review', label: 'Review', icon: TriangleAlert },
  { key: 'excluded', label: 'Excluded', icon: CircleOff },
] as const

function candidateName(
  candidate: CenterlineCandidate,
  candidates: CenterlineCandidate[],
) {
  const sameOverlay = candidates.filter(
    (item) => item.overlayId === candidate.overlayId,
  )
  return sameOverlay.length === 1
    ? candidate.overlayName
    : `${candidate.overlayName} · feature ${candidate.featureIndex + 1}, part ${candidate.partIndex + 1}`
}

function itemStation(item: StationedAssessmentLine) {
  return item.selectedIntersection
    ? formatStation(item.selectedIntersection.stationFeet)
    : null
}

export function AssessmentLinesReviewPanel({
  candidates,
  centerlineId,
  direction,
  startStation,
  reviewTab,
  selectedLineId,
  overrides,
  stationed,
  onBack,
  onMobileClose,
  onCenterlineChange,
  onDirectionChange,
  onStartStationChange,
  onReviewTabChange,
  onSelectLine,
  onSetOverride,
}: AssessmentLinesReviewPanelProps) {
  const counts = {
    included: stationed?.includedCount ?? 0,
    review: stationed?.reviewCount ?? 0,
    excluded: stationed?.excludedCount ?? 0,
  }
  const visibleItems =
    stationed?.items.filter((item) => item.status === reviewTab) ?? []

  return (
    <div className="assessment-review-shell">
      <div className="assessment-review-heading">
        <button
          className="icon-button"
          type="button"
          title="Back to project data"
          aria-label="Back to project data"
          onClick={onBack}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <span className="eyebrow">Analysis</span>
          <h2>Assessment lines</h2>
        </div>
        <button
          className="icon-button mobile-close"
          type="button"
          title="Close project data"
          aria-label="Close project data"
          onClick={onMobileClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="assessment-stationing-controls">
        <label className="field">
          <span>Hydraulic centerline</span>
          <select
            value={centerlineId}
            disabled={candidates.length === 0}
            onChange={(event) => onCenterlineChange(event.target.value)}
          >
            <option value="">Select a line overlay</option>
            {candidates.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidateName(candidate, candidates)}
              </option>
            ))}
          </select>
        </label>
        {candidates.length === 0 ? (
          <p className="assessment-guidance">
            Add a zipped line shapefile under Map overlays, then return here.
          </p>
        ) : null}

        <label className="field">
          <span>
            Starting station
            <small>ft</small>
          </span>
          <input
            type="number"
            step="1"
            value={startStation}
            onChange={(event) => {
              const station = Number(event.target.value)
              if (Number.isFinite(station)) onStartStationChange(station)
            }}
          />
        </label>

        <div className="field">
          <span>Downstream endpoint</span>
          <div className="segmented assessment-direction">
            <button
              type="button"
              className={direction === 'a-to-b' ? 'active' : ''}
              onClick={() => onDirectionChange('a-to-b')}
            >
              A downstream
            </button>
            <button
              type="button"
              className={direction === 'b-to-a' ? 'active' : ''}
              onClick={() => onDirectionChange('b-to-a')}
            >
              B downstream
            </button>
          </div>
        </div>
        <p className="assessment-guidance">
          Stationing increases upstream from the selected endpoint.
        </p>
      </div>

      <div
        className="assessment-review-tabs"
        role="tablist"
        aria-label="Assessment line review status"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              type="button"
              role="tab"
              aria-selected={reviewTab === tab.key}
              className={reviewTab === tab.key ? 'active' : ''}
              onClick={() => onReviewTabChange(tab.key)}
              key={tab.key}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{tab.label}</span>
              <strong>{counts[tab.key]}</strong>
            </button>
          )
        })}
      </div>

      <div className="assessment-review-list" role="tabpanel">
        {!stationed ? (
          <div className="assessment-review-empty">
            <Route size={24} aria-hidden="true" />
            <strong>Select a centerline</strong>
            <span>Endpoint and station controls will activate the review.</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="assessment-review-empty">
            <Check size={24} aria-hidden="true" />
            <strong>No {reviewTab} lines</strong>
          </div>
        ) : (
          visibleItems.map((item) => {
            const selected = item.line.id === selectedLineId
            const station = itemStation(item)
            const lineOverride = overrides[item.line.id]
            const labelVisible = lineOverride?.labelVisible !== false
            return (
              <div
                className={`assessment-review-row${selected ? ' selected' : ''}`}
                key={item.line.id}
              >
                <button
                  type="button"
                  className="assessment-review-select"
                  aria-pressed={selected}
                  onClick={() => onSelectLine(item.line.id)}
                >
                  <span>
                    <strong>WSE {item.line.level.toFixed(1)} ft</strong>
                    {station ? <b>{station}</b> : null}
                  </span>
                  <small>{item.reason}</small>
                  {item.warnings.map((warning) => (
                    <em key={warning}>{warning}</em>
                  ))}
                </button>

                {item.status === 'included' ? (
                  <div className="assessment-label-actions">
                    <button
                      className="icon-button tiny"
                      type="button"
                      title={
                        labelVisible
                          ? 'Hide this WSE callout'
                          : 'Show this WSE callout'
                      }
                      aria-label={
                        labelVisible
                          ? 'Hide this WSE callout'
                          : 'Show this WSE callout'
                      }
                      aria-pressed={labelVisible}
                      onClick={() =>
                        onSetOverride(item.line.id, {
                          labelVisible: !labelVisible,
                        })
                      }
                    >
                      {labelVisible ? (
                        <Eye size={14} aria-hidden="true" />
                      ) : (
                        <EyeOff size={14} aria-hidden="true" />
                      )}
                    </button>
                    {lineOverride?.labelPoint ? (
                      <button
                        className="icon-button tiny"
                        type="button"
                        title="Reset WSE callout position"
                        aria-label="Reset WSE callout position"
                        onClick={() =>
                          onSetOverride(item.line.id, {
                            labelPoint: undefined,
                          })
                        }
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {item.status === 'review' &&
                item.intersections.length > 1 ? (
                  <label className="assessment-intersection-select">
                    <span>Use intersection</span>
                    <select
                      value={item.selectedIntersectionIndex ?? ''}
                      onChange={(event) =>
                        onSetOverride(item.line.id, {
                          intersectionIndex: Number(event.target.value),
                          included: true,
                        })
                      }
                    >
                      <option value="">Choose on centerline</option>
                      {item.intersections.map((intersection) => (
                        <option
                          value={intersection.index}
                          key={intersection.index}
                        >
                          {intersection.index + 1} ·{' '}
                          {formatStation(intersection.stationFeet)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {item.status === 'included' ? (
                  <button
                    type="button"
                    className="text-button assessment-row-action"
                    onClick={() =>
                      onSetOverride(item.line.id, { included: false })
                    }
                  >
                    Exclude
                  </button>
                ) : null}
                {item.status === 'review' ? (
                  <button
                    type="button"
                    className="text-button assessment-row-action"
                    onClick={() =>
                      onSetOverride(item.line.id, { included: false })
                    }
                  >
                    Exclude
                  </button>
                ) : null}
                {item.status === 'excluded' &&
                item.intersections.length === 1 ? (
                  <button
                    type="button"
                    className="text-button assessment-row-action"
                    onClick={() =>
                      onSetOverride(item.line.id, { included: true })
                    }
                  >
                    Include
                  </button>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
