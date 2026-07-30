import { useEffect, useState } from 'react'
import { ChevronLeft, RotateCcw, X } from 'lucide-react'
import {
  ProjectWorkflowNav,
} from './project-data/ProjectWorkflowNav'
import {
  PROJECT_WORKFLOW_MODULES,
  projectWorkflowByKey,
} from './project-data/projectWorkflowRegistry'
import type {
  ProjectWorkflowSection,
  ProjectWorkflowStatus,
} from './project-data/projectWorkflowModule'
import type {
  ProjectDataPanelProps,
  ProjectWorkflowContext,
} from './project-data/projectWorkflowTypes'

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
  const stationed = assessmentReview.stationed

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
  const context: ProjectWorkflowContext = {
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
    stationed,
    sourceLabel:
      scenarios.find((scenario) => scenario.key === assessmentId)?.label ??
      'Assessment source',
    hasSourceRuns: runsFor(assessmentId).length > 0,
    openReview,
  }
  const statuses = PROJECT_WORKFLOW_MODULES.reduce(
    (result, module) => {
      result[module.key] = module.status(context)
      return result
    },
    {} as Record<ProjectWorkflowSection, ProjectWorkflowStatus>,
  )
  const activeModule = projectWorkflowByKey(activeSection)

  return (
    <aside
      className={`sidebar left-sidebar${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
    >
      {collapsed ? (
        <ProjectWorkflowNav
          active={activeSection}
          collapsed
          sections={PROJECT_WORKFLOW_MODULES}
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
            sections={PROJECT_WORKFLOW_MODULES}
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
            {activeModule.render(context)}
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
