import { useEffect, useRef } from 'react'
import {
  Check,
  CircleOff,
  Eye,
  EyeOff,
  RotateCcw,
  Route,
  TriangleAlert,
} from 'lucide-react'
import { formatStation } from '../../core/centerlineStationing'
import type {
  AssessmentLineOverride,
  AssessmentLineOverrides,
  StationedAssessmentLine,
  StationedAssessmentLineCollection,
} from '../../core/types'
import type { AssessmentReviewTab } from './useAssessmentWorkflow'

export type AssessmentLinesReviewPanelProps = {
  reviewTab: AssessmentReviewTab
  selectedLineId: string | null
  overrides: AssessmentLineOverrides
  stationed: StationedAssessmentLineCollection | null
  onReviewTabChange(tab: AssessmentReviewTab): void
  onSelectLine(id: string): void
  onSetOverride(id: string, override: AssessmentLineOverride): void
}

const TABS = [
  { key: 'included', label: 'Included', icon: Check },
  { key: 'review', label: 'Needs review', icon: TriangleAlert },
  { key: 'excluded', label: 'Excluded', icon: CircleOff },
] as const

function itemStation(item: StationedAssessmentLine) {
  return item.selectedIntersection
    ? formatStation(item.selectedIntersection.stationFeet)
    : null
}

export function AssessmentLinesReviewPanel({
  reviewTab,
  selectedLineId,
  overrides,
  stationed,
  onReviewTabChange,
  onSelectLine,
  onSetOverride,
}: AssessmentLinesReviewPanelProps) {
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const counts = {
    included: stationed?.includedCount ?? 0,
    review: stationed?.reviewCount ?? 0,
    excluded: stationed?.excludedCount ?? 0,
  }
  const visibleItems =
    stationed?.items.filter((item) => item.status === reviewTab) ?? []

  useEffect(() => {
    if (!selectedLineId) return
    itemRefs.current.get(selectedLineId)?.scrollIntoView({
      block: 'nearest',
    })
  }, [reviewTab, selectedLineId])

  return (
    <div className="assessment-review-shell">
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
            <strong>Stationing is not ready</strong>
            <span>Choose a centerline in WSE Lines.</span>
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
                ref={(node) => {
                  if (node) itemRefs.current.set(item.line.id, node)
                  else itemRefs.current.delete(item.line.id)
                }}
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
