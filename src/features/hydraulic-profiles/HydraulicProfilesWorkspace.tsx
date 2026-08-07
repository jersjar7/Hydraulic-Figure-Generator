import { LineChart } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import '../../App.css'
import { FigureWorkspaceScaffold } from '../../components/editor/FigureWorkspaceScaffold'
import { WorkspaceActionBar } from '../../components/settings/WorkspaceActionBar'
import { buildHydraulicProfileDataset } from '../../core/hydraulic-profiles/buildHydraulicProfileDataset'
import {
  parseSmsProfileValues,
  parseSmsSummaryTable,
} from '../../core/hydraulic-profiles/smsClipboard'
import type {
  HydraulicProfileScene,
  IngestNotice,
} from '../../core/types'
import { FigurePicker } from '../figures/FigurePicker'
import { createWorkspaceDraftSnapshot } from '../figures/workspaceDraftRepository'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import { ProjectSaveStatus } from '../project-lifecycle/ProjectSaveStatus'
import { downloadHydraulicProfilePng } from './exportHydraulicProfile'
import { HydraulicProfileCanvas } from './HydraulicProfileCanvas'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { createHydraulicProfileReportFigure } from './hydraulicProfileReportAdapter'
import { HydraulicProfileInputPanel } from './HydraulicProfileInputPanel'
import { HydraulicProfileSettingsPanel } from './HydraulicProfileSettingsPanel'
import { HYDRAULIC_PROFILE_WORKSPACE_SETTINGS } from './hydraulicProfileSettingsSections'
import { hydraulicProfileWorkspaceDraft } from './hydraulicProfileWorkspaceDraft'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'

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
      datasetConfiguration,
      selectedSectionId,
      settings,
    },
    hydrationRevision,
    setConditionLabel,
    setSummaryText,
    setProfileText,
    setDatasetConfiguration,
    setSelectedSectionId,
    setSettings,
    reset: resetDocument,
  } = hydraulicProfiles
  useWorkspaceDraftRetention({
    module: hydraulicProfileWorkspaceDraft,
    snapshot: hydraulicProfiles.snapshot,
    hydrate: hydraulicProfiles.hydrate,
  })
  const [scenes, setScenes] = useState<HydraulicProfileScene[]>([])
  const [runtimeNotices, setRuntimeNotices] = useState<IngestNotice[]>([])
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<HydraulicProfileSettingsSectionKey>('layout')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const parsedSummary = useMemo(() => parseSmsSummaryTable(summaryText), [summaryText])
  const parsedProfile = useMemo(() => parseSmsProfileValues(profileText), [profileText])
  const dataset = useMemo(() => buildHydraulicProfileDataset(
    parsedProfile.value,
    parsedSummary.value,
    { datasetConfiguration },
  ), [datasetConfiguration, parsedProfile.value, parsedSummary.value])
  const selectedSection = dataset.sections.find((section) => section.id === selectedSectionId) ?? null
  const scene = scenes.find(({ section }) => section.id === selectedSectionId) ?? scenes[0] ?? null
  const ready = dataset.sections.length > 0 && dataset.mappingStatus.ready
  const generationLabel = dataset.sections.length > 0
    ? `${scenes.length > 0 ? 'Regenerate' : 'Generate'} ${dataset.sections.length} cross section${dataset.sections.length === 1 ? '' : 's'}`
    : 'Generate cross sections'

  useEffect(() => {
    if (!dataset.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(dataset.sections[0]?.id ?? '')
    }
  }, [dataset.sections, selectedSectionId, setSelectedSectionId])

  useEffect(() => setScenes([]), [conditionLabel, dataset])

  useEffect(() => {
    if (hydrationRevision === 0 || !ready) return
    setScenes(dataset.sections.map((section) =>
      hydraulicProfileFigure.buildScene({ conditionLabel, section }),
    ))
  }, [conditionLabel, dataset, hydrationRevision, ready])

  useEffect(() => {
    if (!scene || !canvasRef.current) return
    void hydraulicProfileFigure.render({
      canvas: canvasRef.current,
      document: { scene, settings },
    })
  }, [scene, settings])

  const appendNotices = useCallback((notices: IngestNotice[]) => {
    if (notices.length > 0) setRuntimeNotices((current) => [...current, ...notices].slice(-20))
  }, [])
  const notices = useMemo(() => {
    const current: IngestNotice[] = []
    if (summaryText.trim()) current.push(...parsedSummary.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (profileText.trim()) current.push(...parsedProfile.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (profileText.trim()) current.push(...dataset.warnings.map((text) => ({ level: 'warning' as const, text })))
    return [...current, ...runtimeNotices]
  }, [dataset.warnings, parsedProfile.warnings, parsedSummary.warnings, profileText, runtimeNotices, summaryText])

  const generate = () => {
    try {
      const nextScenes = dataset.sections.map((section) =>
        hydraulicProfileFigure.buildScene({ conditionLabel, section }),
      )
      setScenes(nextScenes)
      if (!nextScenes.some(({ section }) => section.id === selectedSectionId)) {
        setSelectedSectionId(nextScenes[0]?.section.id ?? '')
      }
      appendNotices([{
        level: 'success',
        text: `Generated ${nextScenes.length} hydraulic cross section${nextScenes.length === 1 ? '' : 's'}.`,
      }])
    } catch (error) {
      appendNotices([{ level: 'error', text: error instanceof Error ? error.message : String(error) }])
    }
  }

  const createExportFigure = () => {
    if (!scene) return null
    const workspaceDraft = createWorkspaceDraftSnapshot(
      hydraulicProfileWorkspaceDraft,
      { ...hydraulicProfiles.snapshot, selectedSectionId: scene.section.id },
    )
    return createHydraulicProfileReportFigure({ scene, settings }, workspaceDraft)
  }

  const addAllToExport = () => {
    if (scenes.length === 0) return
    scenes.forEach((generatedScene) => {
      const workspaceDraft = createWorkspaceDraftSnapshot(
        hydraulicProfileWorkspaceDraft,
        {
          ...hydraulicProfiles.snapshot,
          selectedSectionId: generatedScene.section.id,
        },
      )
      reportAssembly.addFigure(
        createHydraulicProfileReportFigure(
          { scene: generatedScene, settings },
          workspaceDraft,
        ),
      )
    })
    appendNotices([{
      level: 'success',
      text: `${scenes.length} hydraulic cross sections were added to the Export Collection.`,
    }])
  }

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
    setScenes([])
    setRuntimeNotices([])
    setLeftCollapsed(false)
  }

  return (
    <>
      <FigureWorkspaceScaffold<HydraulicProfileSettingsSectionKey>
        figureLabel={hydraulicProfileFigure.label}
      comparisonDescription={selectedSection ? `${conditionLabel} | Station ${selectedSection.stationLabel}` : 'SMS Summary Table + Profile Values'}
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
          dataset={dataset}
          summaryRows={parsedSummary.value}
          selectedSectionId={selectedSectionId}
          onConditionLabelChange={setConditionLabel}
          onSummaryTextChange={setSummaryText}
          onProfileTextChange={setProfileText}
          onSelectedSectionChange={setSelectedSectionId}
          onDatasetConfigurationChange={setDatasetConfiguration}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onReset={reset}
        />
      }
      mapContent={<HydraulicProfileCanvas scene={scene} scenes={scenes} selectedSectionId={scene?.section.id ?? selectedSectionId} orientation={settings.orientation} canvasRef={canvasRef} onStationSelect={setSelectedSectionId} />}
      settingsContent={
        <HydraulicProfileSettingsPanel
          section={activeSection}
          settings={settings}
          profileSection={selectedSection}
          canDownload={Boolean(scene)}
          datasetConfiguration={dataset.configuration}
          onSettingsChange={setSettings}
          onDatasetConfigurationChange={setDatasetConfiguration}
          exportActions={
            <ReportFigureExportActions
              workspaceId={hydraulicProfileFigure.id}
              canExport={Boolean(scene)}
              createFigure={createExportFigure}
              addLabel="Add current station to export"
              addVariant={scenes.length > 1 ? 'secondary' : 'primary'}
              onSuccess={(text) => appendNotices([{ level: 'success', text }])}
            />
          }
          generatedCount={scenes.length}
          onAddAllToExport={addAllToExport}
          onDownload={() => { if (scene) downloadHydraulicProfilePng(scene, settings) }}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<LineChart size={18} aria-hidden="true" />}
          label={generationLabel}
          disabled={!ready}
          testId="generate-hydraulic-profile"
          hint={!ready
            ? dataset.sections.length > 0
              ? 'Review the dataset mapping before generating'
              : 'Paste and review one complete SMS profile first'
            : undefined}
          onClick={generate}
        />
      }
        figurePicker={<FigurePicker />}
      />
    </>
  )
}
