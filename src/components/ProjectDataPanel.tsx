import { useEffect, useState } from 'react'
import { ChevronLeft, RotateCcw, X } from 'lucide-react'
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
import type { AssessmentStationingControlsProps } from '../features/assessment-lines/AssessmentStationingControls'
import type { AssessmentPanelView } from '../features/assessment-lines/useAssessmentWorkflow'
import { AssessmentWorkspace } from './project-data/AssessmentWorkspace'
import { LayersWorkspace } from './project-data/LayersWorkspace'
import { ModelsWorkspace } from './project-data/ModelsWorkspace'
import type { ScenarioRole } from './project-data/ModelsWorkspace'
import {
  ProjectWorkflowNav,
  type ProjectWorkflowSection,
  type ProjectWorkflowStatus,
} from './project-data/ProjectWorkflowNav'

type AssessmentReviewProps = AssessmentLinesReviewPanelProps &
  AssessmentStationingControlsProps & {
    view: AssessmentPanelView
    onOpen(): void
    onBack(): void
  }

type ProjectDataPanelProps = {
  mobileOpen: boolean
  collapsed: boolean
  busy: boolean
  scenarios: ConditionData[]
  baselineId: ConditionKey
  comparisonId: ConditionKey
  assessmentId: ConditionKey
  runByScenario: Record<ConditionKey, number>
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
  onRenameCondition(key: ConditionKey, label: string): void
  onRoleChange(role: ScenarioRole, key: ConditionKey): void
  onRunChange(key: ConditionKey, index: number): void
  runsFor(key: ConditionKey): RunSelection[]
  onAssessmentIntervalChange(interval: number): void
  onGenerateAssessmentLines(): void
  onClearAssessmentLines(): void
  onShowOverlaysChange(visible: boolean): void
  onUpdateOverlay(id: string, patch: Partial<MapOverlay>): void
  onRemoveOverlay(id: string): void
  onReset(): void
}

function conditionComplete(condition?: ConditionData) {
  return Boolean(
    condition?.geometryFileName &&
      condition.datasetFileName &&
      condition.projected &&
      condition.datasets,
  )
}

export function ProjectDataPanel({
  mobileOpen,
  collapsed,
  busy,
  scenarios,
  baselineId,
  comparisonId,
  assessmentId,
  runByScenario,
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
  onRenameCondition,
  onRoleChange,
  onRunChange,
  runsFor,
  onAssessmentIntervalChange,
  onGenerateAssessmentLines,
  onClearAssessmentLines,
  onShowOverlaysChange,
  onUpdateOverlay,
  onRemoveOverlay,
  onReset,
}: ProjectDataPanelProps) {
  const [activeSection, setActiveSection] =
    useState<ProjectWorkflowSection>('models')
  const loadedConditionCount = scenarios.filter(conditionComplete).length
  const stationed = assessmentReview.stationed
  const statuses: Record<ProjectWorkflowSection, ProjectWorkflowStatus> = {
    models: {
      badge: loadedConditionCount || undefined,
      tone:
        loadedConditionCount >= 2
          ? 'ready'
          : loadedConditionCount > 0
            ? 'warning'
            : 'neutral',
    },
    layers: {
      badge: overlays.length > 0 ? overlays.length : undefined,
      tone: overlays.length > 0 ? 'ready' : 'neutral',
    },
    assessment: {
      badge:
        assessmentLines.lines.length > 0
          ? assessmentLines.lines.length
          : undefined,
      tone: assessmentLines.lines.length > 0 ? 'ready' : 'neutral',
    },
    review: {
      badge: stationed
        ? stationed.reviewCount > 0
          ? stationed.reviewCount
          : stationed.includedCount
        : assessmentLines.lines.length > 0
          ? '!'
          : undefined,
      tone: stationed
        ? stationed.reviewCount > 0
          ? 'warning'
          : 'ready'
        : assessmentLines.lines.length > 0
          ? 'warning'
          : 'neutral',
    },
  }

  useEffect(() => {
    if (assessmentReview.view === 'review') setActiveSection('review')
  }, [assessmentReview.view])

  const selectSection = (section: ProjectWorkflowSection) => {
    setActiveSection(section)
    if (section === 'review') assessmentReview.onOpen()
    else if (assessmentReview.view === 'review') assessmentReview.onBack()
  }

  const openReview = () => {
    setActiveSection('review')
    assessmentReview.onOpen()
  }

  const resetProject = () => {
    setActiveSection('models')
    assessmentReview.onBack()
    onReset()
  }

  return (
    <aside
      className={`sidebar left-sidebar${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
    >
      {collapsed ? (
        <ProjectWorkflowNav
          active={activeSection}
          collapsed
          statuses={statuses}
          onExpand={onExpand}
          onSelect={selectSection}
        />
      ) : (
        <>
          <div className="sidebar-heading project-sidebar-heading">
            <div>
              <span className="eyebrow">Inputs</span>
              <h2>Project workflow</h2>
            </div>
            <div className="sidebar-heading-actions">
              <button
                className="icon-button desktop-collapse"
                type="button"
                title="Collapse project workflow"
                aria-label="Collapse project workflow"
                onClick={onCollapse}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button mobile-close"
                type="button"
                title="Close project workflow"
                aria-label="Close project workflow"
                onClick={onMobileClose}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <ProjectWorkflowNav
            active={activeSection}
            collapsed={false}
            statuses={statuses}
            onExpand={onExpand}
            onSelect={selectSection}
          />

          <div
            className={`project-workflow-content${activeSection === 'review' ? ' is-review' : ''}`}
            id={`project-workflow-panel-${activeSection}`}
            role="tabpanel"
            aria-labelledby={`project-workflow-tab-${activeSection}`}
          >
            {activeSection === 'models' ? (
              <ModelsWorkspace
                busy={busy}
                scenarios={scenarios}
                baselineId={baselineId}
                comparisonId={comparisonId}
                assessmentId={assessmentId}
                runByScenario={runByScenario}
                onH5Files={onH5Files}
                onRemoveCondition={onRemoveCondition}
                onRenameCondition={onRenameCondition}
                onRoleChange={onRoleChange}
                onRunChange={onRunChange}
                runsFor={runsFor}
              />
            ) : null}

            {activeSection === 'layers' ? (
              <LayersWorkspace
                busy={busy}
                overlays={overlays}
                showOverlays={showOverlays}
                onOverlayFiles={onOverlayFiles}
                onShowOverlaysChange={onShowOverlaysChange}
                onUpdateOverlay={onUpdateOverlay}
                onRemoveOverlay={onRemoveOverlay}
              />
            ) : null}

            {activeSection === 'assessment' ? (
              <AssessmentWorkspace
                busy={busy}
                hasSourceRuns={runsFor(assessmentId).length > 0}
                sourceLabel={
                  scenarios.find((scenario) => scenario.key === assessmentId)
                    ?.label ?? 'Assessment source'
                }
                assessmentLines={assessmentLines}
                stationed={stationed}
                stationing={assessmentReview}
                onAssessmentIntervalChange={onAssessmentIntervalChange}
                onGenerateAssessmentLines={onGenerateAssessmentLines}
                onClearAssessmentLines={onClearAssessmentLines}
                onOpenReview={openReview}
              />
            ) : null}

            {activeSection === 'review' ? (
              <AssessmentLinesReviewPanel {...assessmentReview} />
            ) : null}
          </div>

          <div className="project-workflow-footer">
            <button
              className="text-button reset-project"
              type="button"
              onClick={resetProject}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset project
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
