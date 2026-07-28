import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  RefreshCcw,
  RotateCcw,
  Spline,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { runDisplayName } from '../core/hydraulicEngine'
import type {
  ConditionData,
  ConditionKey,
  MapOverlay,
  RunSelection,
  WseAssessmentLineCollection,
} from '../core/types'
import {
  AssessmentLinesReviewPanel,
  type AssessmentLinesReviewPanelProps,
} from '../features/assessment-lines/AssessmentLinesReviewPanel'
import type { AssessmentPanelView } from '../features/assessment-lines/useAssessmentWorkflow'
import { FileDrop } from './FileDrop'

type AssessmentReviewProps = AssessmentLinesReviewPanelProps & {
  view: AssessmentPanelView
  onOpen(): void
}

type ProjectDataPanelProps = {
  mobileOpen: boolean
  collapsed: boolean
  busy: boolean
  existingCondition?: ConditionData
  proposedCondition?: ConditionData
  existingRuns: RunSelection[]
  proposedRuns: RunSelection[]
  existingRun: number
  proposedRun: number
  assessmentLines: WseAssessmentLineCollection
  assessmentReview: AssessmentReviewProps
  overlays: MapOverlay[]
  showOverlays: boolean
  onCollapse(): void
  onExpand(): void
  onMobileClose(): void
  onH5Files(files: File[]): void
  onOverlayFiles(files: File[]): void
  onRemoveCondition(key: ConditionKey): void
  onExistingRunChange(index: number): void
  onProposedRunChange(index: number): void
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onClearAssessmentLines(): void
  onShowOverlaysChange(visible: boolean): void
  onUpdateOverlay(id: string, patch: Partial<MapOverlay>): void
  onRemoveOverlay(id: string): void
  onReset(): void
}

function ConditionStatus({
  label,
  conditionKey,
  condition,
  onRemove,
}: {
  label: string
  conditionKey: ConditionKey
  condition?: ConditionData
  onRemove(): void
}) {
  const geometryName = condition?.geometryFileName
  const datasetName = condition?.datasetFileName
  const complete = Boolean(geometryName && datasetName)
  return (
    <div className={`condition-row${complete ? ' complete' : ''}`}>
      <div className="condition-name">
        <span className={`condition-code ${conditionKey.toLowerCase()}`}>
          {conditionKey}
        </span>
        <strong>{label}</strong>
        {condition ? (
          <button
            className="icon-button tiny danger condition-remove"
            type="button"
            title={`Remove ${label} inputs`}
            aria-label={`Remove ${label} inputs`}
            onClick={onRemove}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="condition-badges">
        <span
          className={geometryName ? 'status-badge ready' : 'status-badge'}
          title={geometryName}
        >
          {geometryName
            ? `${condition?.projected?.N.toLocaleString()} nodes`
            : 'geometry'}
        </span>
        <span
          className={datasetName ? 'status-badge ready' : 'status-badge'}
          title={datasetName}
        >
          {datasetName ? `${condition?.datasets?.runs.length} runs` : 'datasets'}
        </span>
      </div>
    </div>
  )
}

export function ProjectDataPanel({
  mobileOpen,
  collapsed,
  busy,
  existingCondition,
  proposedCondition,
  existingRuns,
  proposedRuns,
  existingRun,
  proposedRun,
  assessmentLines,
  assessmentReview,
  overlays,
  showOverlays,
  onCollapse,
  onExpand,
  onMobileClose,
  onH5Files,
  onOverlayFiles,
  onRemoveCondition,
  onExistingRunChange,
  onProposedRunChange,
  onAssessmentIntervalChange,
  onGenerateAssessmentLines,
  onClearAssessmentLines,
  onShowOverlaysChange,
  onUpdateOverlay,
  onRemoveOverlay,
  onReset,
}: ProjectDataPanelProps) {
  return (
    <aside
      className={`sidebar left-sidebar${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}${assessmentReview.view === 'review' ? ' assessment-review-mode' : ''}`}
    >
      {collapsed ? (
        <div className="left-sidebar-rail">
          <button
            className="icon-button left-rail-expand"
            type="button"
            title="Expand project data"
            aria-label="Expand project data"
            onClick={onExpand}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <div className="left-rail-conditions" aria-label="Input status">
            <button
              className={`left-rail-condition${existingCondition?.projected && existingCondition.datasets ? ' ready' : ''}`}
              type="button"
              title="Expand Existing inputs"
              aria-label="Expand Existing inputs"
              onClick={onExpand}
            >
              EX
            </button>
            <button
              className={`left-rail-condition${proposedCondition?.projected && proposedCondition.datasets ? ' ready' : ''}`}
              type="button"
              title="Expand Proposed inputs"
              aria-label="Expand Proposed inputs"
              onClick={onExpand}
            >
              PR
            </button>
          </div>
          <button
            className="icon-button left-rail-overlays"
            type="button"
            title="Expand shapefile overlays"
            aria-label="Expand shapefile overlays"
            onClick={onExpand}
          >
            <Layers3 size={17} aria-hidden="true" />
          </button>
          <button
            className={`icon-button left-rail-analysis${assessmentLines.lines.length > 0 ? ' ready' : ''}`}
            type="button"
            title="Expand Existing WSE assessment lines"
            aria-label="Expand Existing WSE assessment lines"
            onClick={() => {
              onExpand()
              if (assessmentLines.lines.length > 0) assessmentReview.onOpen()
            }}
          >
            <Spline size={17} aria-hidden="true" />
          </button>
        </div>
      ) : assessmentReview.view === 'review' ? (
        <AssessmentLinesReviewPanel {...assessmentReview} />
      ) : (
        <>
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Inputs</span>
              <h2>Project data</h2>
            </div>
            <div className="sidebar-heading-actions">
              <button
                className="icon-button desktop-collapse"
                type="button"
                title="Collapse project data"
                aria-label="Collapse project data"
                onClick={onCollapse}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button mobile-close"
                type="button"
                title="Close project data"
                aria-label="Close project data"
                onClick={onMobileClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <section className="sidebar-block">
            <div className="block-title">
              <UploadCloud size={17} aria-hidden="true" />
              <span>SMS mesh and results</span>
              <span className="file-chip">.h5</span>
            </div>
            <FileDrop
              accept=".h5"
              title="Add geometry + datasets"
              description="Existing and Proposed, any order"
              disabled={busy}
              testId="h5-file-drop"
              onFiles={onH5Files}
            />
            <div className="condition-list">
              <ConditionStatus
                label="Existing"
                conditionKey="EX"
                condition={existingCondition}
                onRemove={() => onRemoveCondition('EX')}
              />
              <ConditionStatus
                label="Proposed"
                conditionKey="PR"
                condition={proposedCondition}
                onRemove={() => onRemoveCondition('PR')}
              />
            </div>
          </section>

          <section className="sidebar-block">
            <div className="block-title">
              <RefreshCcw size={17} aria-hidden="true" />
              <span>Run pairing</span>
            </div>
            <label className="field">
              <span>Existing run</span>
              <select
                value={existingRun}
                disabled={existingRuns.length === 0}
                onChange={(event) =>
                  onExistingRunChange(Number(event.target.value))
                }
              >
                {existingRuns.length === 0 ? (
                  <option>Waiting for Existing files</option>
                ) : (
                  existingRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>Proposed run</span>
              <select
                value={proposedRun}
                disabled={proposedRuns.length === 0}
                onChange={(event) =>
                  onProposedRunChange(Number(event.target.value))
                }
              >
                {proposedRuns.length === 0 ? (
                  <option>Waiting for Proposed files</option>
                ) : (
                  proposedRuns.map((selection) => (
                    <option key={selection.index} value={selection.index}>
                      {runDisplayName(selection.run.name)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </section>

          <section className="sidebar-block assessment-block">
            <div className="block-title">
              <Spline size={17} aria-hidden="true" />
              <span>Assessment lines</span>
              <span className="file-chip">WSE</span>
            </div>
            <label className="field">
              <span>Existing WSE interval</span>
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
              disabled={busy || existingRuns.length === 0}
              onClick={onGenerateAssessmentLines}
            >
              <RefreshCcw size={15} aria-hidden="true" />
              {assessmentLines.lines.length > 0
                ? 'Regenerate lines'
                : 'Generate from Existing WSE'}
            </button>
            {assessmentLines.lines.length > 0 ? (
              <>
                <div className="assessment-summary">
                  <div>
                    <strong>
                      {assessmentLines.lines.length.toLocaleString()} lines
                    </strong>
                    <span>
                      {assessmentLines.levelCount.toLocaleString()} levels
                      {assessmentLines.minimumLevel !== null &&
                      assessmentLines.maximumLevel !== null
                        ? ` · ${assessmentLines.minimumLevel.toFixed(1)}–${assessmentLines.maximumLevel.toFixed(1)} ft`
                        : ''}
                    </span>
                    {assessmentReview.stationed ? (
                      <span>
                        {assessmentReview.stationed.includedCount} included ·{' '}
                        {assessmentReview.stationed.reviewCount} review
                      </span>
                    ) : null}
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
                <button
                  className="button secondary compact full assessment-review-button"
                  type="button"
                  onClick={assessmentReview.onOpen}
                >
                  <Spline size={15} aria-hidden="true" />
                  Review and station
                </button>
              </>
            ) : (
              <p className="empty-note">
                No reusable Existing WSE lines generated.
              </p>
            )}
          </section>

          <section className="sidebar-block overlay-block">
            <div className="block-title">
              <Layers3 size={17} aria-hidden="true" />
              <span>Map overlays</span>
              <span className="file-chip">.zip</span>
            </div>
            <FileDrop
              accept=".zip"
              title="Add zipped shapefiles"
              description="Centerlines, ROW, project limits"
              disabled={busy}
              testId="overlay-file-drop"
              onFiles={onOverlayFiles}
            />
            {overlays.length > 0 ? (
              <label className="toggle-row">
                <span>Show shapefile overlays</span>
                <input
                  type="checkbox"
                  checked={showOverlays}
                  onChange={(event) =>
                    onShowOverlaysChange(event.target.checked)
                  }
                />
                <span className="toggle-track" aria-hidden="true">
                  <span />
                </span>
              </label>
            ) : null}
            {overlays.length === 0 ? (
              <p className="empty-note">No shapefile overlays loaded.</p>
            ) : (
              <div className="overlay-list">
                {overlays.map((overlay) => (
                  <div className="overlay-row" key={overlay.id}>
                    <label className="overlay-visible">
                      <input
                        type="checkbox"
                        checked={overlay.visible}
                        onChange={(event) =>
                          onUpdateOverlay(overlay.id, {
                            visible: event.target.checked,
                          })
                        }
                      />
                      <span title={overlay.name}>{overlay.name}</span>
                    </label>
                    <input
                      type="color"
                      value={overlay.color}
                      aria-label={`${overlay.name} color`}
                      onChange={(event) =>
                        onUpdateOverlay(overlay.id, {
                          color: event.target.value,
                        })
                      }
                    />
                    <input
                      className="width-input"
                      type="number"
                      min="1"
                      max="12"
                      step="0.5"
                      value={overlay.width}
                      aria-label={`${overlay.name} line width`}
                      onChange={(event) =>
                        onUpdateOverlay(overlay.id, {
                          width: Number(event.target.value) || 3,
                        })
                      }
                    />
                    <button
                      className="icon-button small danger"
                      type="button"
                      title={`Remove ${overlay.name}`}
                      aria-label={`Remove ${overlay.name}`}
                      onClick={() => onRemoveOverlay(overlay.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button
            className="text-button reset-project"
            type="button"
            onClick={onReset}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reset project
          </button>
        </>
      )}
    </aside>
  )
}
