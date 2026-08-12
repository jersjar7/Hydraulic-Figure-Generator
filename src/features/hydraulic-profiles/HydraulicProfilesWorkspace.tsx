import { LineChart } from 'lucide-react'
import { useMemo, useRef } from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import type { HydraulicProfileView } from '../../core/types'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import { ProjectSaveStatus } from '../project-lifecycle/ProjectSaveStatus'
import { HydraulicProfileCanvas } from './HydraulicProfileCanvas'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { HydraulicProfileInputPanel } from './HydraulicProfileInputPanel'
import { HydraulicProfileSettingsPanel } from './HydraulicProfileSettingsPanel'
import { HYDRAULIC_PROFILE_WORKSPACE_SETTINGS } from './hydraulicProfileSettingsSections'
import { hydraulicProfileWorkspaceDraft } from './hydraulicProfileWorkspaceDraft'
import { createHydraulicProfileOutputController } from './hydraulicProfileOutputController'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'
import { useHydraulicProfileAnalysis } from './useHydraulicProfileAnalysis'
import { useHydraulicProfileGeneration } from './useHydraulicProfileGeneration'
import { useHydraulicProfileRendering } from './useHydraulicProfileRendering'
import { useHydraulicProfilesWorkspaceUi } from './useHydraulicProfilesWorkspaceUi'

export function HydraulicProfilesWorkspace() {
  const {
    reportAssembly,
    hydraulicProfiles,
    projectLifecycle,
  } = useHydraulicProjectWorkspace()
  const {
    snapshot: {
      conditionLabel,
      summaryText,
      profileText,
      longitudinalProfileText,
      view,
      datasetConfiguration,
      selectedSectionId,
      crossSectionCulverts,
      longitudinalCulverts,
      settings,
    },
    hydrationRevision,
    setConditionLabel,
    setSummaryText,
    setProfileText,
    setLongitudinalProfileText,
    setView,
    setDatasetConfiguration,
    setSelectedSectionId,
    setCrossSectionCulverts,
    setLongitudinalCulverts,
    setSettings,
    reset: resetDocument,
  } = hydraulicProfiles
  useWorkspaceDraftRetention({
    module: hydraulicProfileWorkspaceDraft,
    snapshot: hydraulicProfiles.snapshot,
    hydrate: hydraulicProfiles.hydrate,
  })
  const ui = useHydraulicProfilesWorkspaceUi()
  const {
    runtimeNotices,
    leftOpen,
    leftCollapsed,
    rightOpen,
    activeSection,
    setLeftOpen,
    setLeftCollapsed,
    setRightOpen,
    setActiveSection,
    appendNotices,
    resetForProject,
  } = ui
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const analysis = useHydraulicProfileAnalysis({
    conditionLabel,
    summaryText,
    profileText,
    longitudinalProfileText,
    datasetConfiguration,
    selectedSectionId,
    crossSectionCulverts,
    longitudinalCulverts,
  })
  const {
    parsedSummary,
    parsedLongitudinal,
    dataset,
    selectedSection,
    currentCrossSectionCulvert,
    longitudinalCandidate,
  } = analysis
  const generation = useHydraulicProfileGeneration({
    conditionLabel,
    dataset,
    selectedSectionId,
    setSelectedSectionId,
    currentCrossSectionCulvert,
    longitudinalCandidate,
    longitudinalProfileText,
    datasetConfiguration,
    hydrationRevision,
    view,
    appendNotices,
  })
  const {
    scenes,
    scene,
    longitudinalScene,
    ready,
    generationLabel,
    generationHint,
    generate,
    resetGenerated,
  } = generation
  useHydraulicProfileRendering({
    canvasRef,
    view,
    scene,
    longitudinalScene,
    settings,
  })
  const notices = useMemo(
    () => [...analysis.notices, ...runtimeNotices],
    [analysis.notices, runtimeNotices],
  )
  const output = createHydraulicProfileOutputController({
    snapshot: hydraulicProfiles.snapshot,
    settings,
    scene,
    longitudinalScene,
    scenes,
    addFigure: reportAssembly.addFigure,
    appendNotices,
  })

  const saveProject = async () => {
    try {
      if (await projectLifecycle.saveProject()) {
        appendNotices([{ level: 'success', text: 'Project folder saved.' }])
      }
    } catch (error) {
      appendNotices([{
        level: 'error',
        text: `Project save failed: ${error instanceof Error ? error.message : String(error)}`,
      }])
    }
  }

  const reset = () => {
    if (!projectLifecycle.confirmDiscard()) return
    resetDocument()
    resetGenerated()
    resetForProject()
  }

  const changeView = (nextView: HydraulicProfileView) => {
    setView(nextView)
    setSettings((current) => ({
      ...current,
      title: current.title === 'Hydraulic Cross Section' || current.title === 'Longitudinal Hydraulic Profile'
        ? nextView === 'longitudinal' ? 'Longitudinal Hydraulic Profile' : 'Hydraulic Cross Section'
        : current.title,
      xAxisLabel: current.xAxisLabel === 'Distance (feet)' || current.xAxisLabel === 'Station (feet)'
        ? nextView === 'longitudinal' ? 'Station (feet)' : 'Distance (feet)'
        : current.xAxisLabel,
    }))
  }

  const updateCrossSectionCulvert = (culvert: typeof currentCrossSectionCulvert) => {
    if (!selectedSection) return
    setCrossSectionCulverts((current) => culvert
      ? [...current.filter(({ sectionId }) => sectionId !== selectedSection.id), culvert]
      : current.filter(({ sectionId }) => sectionId !== selectedSection.id))
  }

  return (
    <>
      <FigureWorkspaceScaffold<HydraulicProfileSettingsSectionKey>
        figureLabel={hydraulicProfileFigure.label}
      comparisonDescription={view === 'longitudinal' ? `${conditionLabel} | Longitudinal profile` : selectedSection ? `${conditionLabel} | Station ${selectedSection.stationLabel}` : 'SMS Summary Table + Profile Values'}
      inputsCollapsed={leftCollapsed}
      leftPanelOpen={leftOpen}
      rightPanelOpen={rightOpen}
      busy={false}
      notices={notices}
      settingsSections={HYDRAULIC_PROFILE_WORKSPACE_SETTINGS}
      activeSettingsSection={activeSection}
      showMapActions={false}
      onSave={() => void saveProject()}
      onLoad={() => void projectLifecycle.openProject()}
      onNew={projectLifecycle.requestNewProject}
      onOpenLeftPanel={() => { setLeftCollapsed(false); setLeftOpen(true) }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => { setLeftOpen(false); setRightOpen(false) }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={setActiveSection}
      onZoomOut={() => undefined}
      onZoomIn={() => undefined}
      onFitFrame={() => undefined}
      projectStatus={
        <ProjectSaveStatus
          projectName={projectLifecycle.projectName}
          dirty={projectLifecycle.isDirty}
          error={projectLifecycle.error}
        />
      }
      saveLabel="Save project"
      loadLabel="Open project"
      projectPanel={
        <HydraulicProfileInputPanel
          mobileOpen={leftOpen}
          collapsed={leftCollapsed}
          conditionLabel={conditionLabel}
          summaryText={summaryText}
          profileText={profileText}
          longitudinalProfileText={longitudinalProfileText}
          longitudinalSeriesCount={parsedLongitudinal.value.length}
          dataset={dataset}
          summaryRows={parsedSummary.value}
          selectedSectionId={selectedSectionId}
          onConditionLabelChange={setConditionLabel}
          onSummaryTextChange={setSummaryText}
          onProfileTextChange={setProfileText}
          onLongitudinalProfileTextChange={setLongitudinalProfileText}
          onSelectedSectionChange={setSelectedSectionId}
          onDatasetConfigurationChange={setDatasetConfiguration}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onReset={reset}
        />
      }
      mapContent={<HydraulicProfileCanvas scene={scene} longitudinalScene={longitudinalScene} view={view} scenes={scenes} selectedSectionId={scene?.section.id ?? selectedSectionId} orientation={settings.orientation} canvasRef={canvasRef} onStationSelect={setSelectedSectionId} onViewChange={changeView} />}
      settingsContent={
        <HydraulicProfileSettingsPanel
          section={activeSection}
          settings={settings}
          profileSection={selectedSection}
          canDownload={view === 'longitudinal' ? Boolean(longitudinalScene) : Boolean(scene)}
          datasetConfiguration={dataset.configuration}
          view={view}
          longitudinalScene={longitudinalScene ?? longitudinalCandidate}
          crossSectionCulvert={currentCrossSectionCulvert}
          longitudinalCulverts={longitudinalCulverts}
          onSettingsChange={setSettings}
          onDatasetConfigurationChange={setDatasetConfiguration}
          onCrossSectionCulvertChange={updateCrossSectionCulvert}
          onLongitudinalCulvertsChange={setLongitudinalCulverts}
          exportActions={
            <ReportFigureExportActions
              workspaceId={hydraulicProfileFigure.id}
              canExport={view === 'longitudinal' ? Boolean(longitudinalScene) : Boolean(scene)}
              createFigure={output.createExportFigure}
              addLabel={view === 'longitudinal' ? 'Add longitudinal profile to export' : 'Add current station to export'}
              addVariant={view === 'cross-sections' && scenes.length > 1 ? 'secondary' : 'primary'}
              onSuccess={(text) => appendNotices([{ level: 'success', text }])}
            />
          }
          generatedCount={view === 'cross-sections' ? scenes.length : 0}
          onAddAllToExport={output.addAllToExport}
          onDownload={output.download}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<LineChart size={18} aria-hidden="true" />}
          label={generationLabel}
          disabled={!ready}
          testId="generate-hydraulic-profile"
          hint={generationHint}
          onClick={generate}
        />
      }
      />
    </>
  )
}
