import { useEffect, useMemo, useState } from 'react'
import {
  projectWorkflowsForInputs,
} from './project-data/projectWorkflowRegistry'
import type {
  ProjectWorkflowSection,
} from './project-data/projectWorkflowModule'
import { ProjectWorkflowPanel } from './project-data/ProjectWorkflowPanel'
import type {
  ProjectDataPanelProps,
  ProjectWorkflowContext,
} from './project-data/projectWorkflowTypes'

export function ProjectDataPanel({
  mobileOpen,
  collapsed,
  busy,
  scenarios,
  missingInputReferences,
  scenarioRoles,
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
  inputCapabilities,
}: ProjectDataPanelProps) {
  const modules = useMemo(
    () => projectWorkflowsForInputs(inputCapabilities),
    [inputCapabilities],
  )
  const firstSection = modules[0]?.key ?? 'models'
  const [activeSection, setActiveSection] =
    useState<ProjectWorkflowSection>(firstSection)
  const stationed = assessmentReview.stationed

  useEffect(() => {
    if (
      assessmentReview.view === 'review' &&
      modules.some((module) => module.key === 'review')
    ) {
      setActiveSection('review')
      return
    }
    if (!modules.some((module) => module.key === activeSection)) {
      setActiveSection(firstSection)
    }
  }, [
    activeSection,
    assessmentReview.view,
    firstSection,
    modules,
  ])

  const selectSection = (section: ProjectWorkflowSection) => {
    setActiveSection(section)
    if (section === 'review') assessmentReview.onOpen()
    else if (assessmentReview.view === 'review') assessmentReview.onBack()
  }

  const openReview = () => {
    if (!modules.some((module) => module.key === 'review')) return
    setActiveSection('review')
    assessmentReview.onOpen()
  }

  const resetProject = () => {
    setActiveSection(firstSection)
    assessmentReview.onBack()
    onReset()
  }
  const context: ProjectWorkflowContext = {
    inputCapabilities,
    mobileOpen,
    collapsed,
    busy,
    scenarios,
    missingInputReferences,
    scenarioRoles,
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
  return (
    <ProjectWorkflowPanel
      active={activeSection}
      modules={modules}
      context={context}
      mobileOpen={mobileOpen}
      collapsed={collapsed}
      contentClassName={activeSection === 'review' ? 'is-review' : ''}
      onSelect={selectSection}
      onCollapse={onCollapse}
      onExpand={onExpand}
      onMobileClose={onMobileClose}
      onReset={resetProject}
    />
  )
}
