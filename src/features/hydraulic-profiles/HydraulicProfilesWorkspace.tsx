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
import { buildHydraulicLongitudinalScene } from '../../core/hydraulic-profiles/buildHydraulicLongitudinalScene'
import {
  parseSmsProfileValues,
  parseSmsSummaryTable,
} from '../../core/hydraulic-profiles/smsClipboard'
import type {
  HydraulicProfileScene,
  HydraulicProfileView,
  IngestNotice,
} from '../../core/types'
import { createWorkspaceDraftSnapshot } from '../figures/workspaceDraftRepository'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { useWorkspaceDraftRetention } from '../project-workspace/useWorkspaceDraftRetention'
import { ProjectSaveStatus } from '../project-lifecycle/ProjectSaveStatus'
import { downloadHydraulicLongitudinalPng, downloadHydraulicProfilePng } from './exportHydraulicProfile'
import { HydraulicProfileCanvas } from './HydraulicProfileCanvas'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { createHydraulicLongitudinalReportFigure, createHydraulicProfileReportFigure } from './hydraulicProfileReportAdapter'
import { HydraulicProfileInputPanel } from './HydraulicProfileInputPanel'
import { HydraulicProfileSettingsPanel } from './HydraulicProfileSettingsPanel'
import { HYDRAULIC_PROFILE_WORKSPACE_SETTINGS } from './hydraulicProfileSettingsSections'
import { hydraulicProfileWorkspaceDraft } from './hydraulicProfileWorkspaceDraft'
import { ReportFigureExportActions } from '../project-workspace/ReportFigureExportActions'
import { renderHydraulicLongitudinalDocument } from './hydraulicLongitudinalRenderer'

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
  const [scenes, setScenes] = useState<HydraulicProfileScene[]>([])
  const [longitudinalGenerated, setLongitudinalGenerated] = useState(false)
  const [runtimeNotices, setRuntimeNotices] = useState<IngestNotice[]>([])
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<HydraulicProfileSettingsSectionKey>('layout')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const parsedSummary = useMemo(() => parseSmsSummaryTable(summaryText), [summaryText])
  const parsedProfile = useMemo(() => parseSmsProfileValues(profileText), [profileText])
  const parsedLongitudinal = useMemo(
    () => parseSmsProfileValues(longitudinalProfileText),
    [longitudinalProfileText],
  )
  const dataset = useMemo(() => buildHydraulicProfileDataset(
    parsedProfile.value,
    parsedSummary.value,
    { datasetConfiguration },
  ), [datasetConfiguration, parsedProfile.value, parsedSummary.value])
  const selectedSection = dataset.sections.find((section) => section.id === selectedSectionId) ?? null
  const baseScene = scenes.find(({ section }) => section.id === selectedSectionId) ?? scenes[0] ?? null
  const currentCrossSectionCulvert = selectedSection
    ? crossSectionCulverts.find(({ sectionId }) => sectionId === selectedSection.id) ?? null
    : null
  const scene = useMemo(
    () => baseScene ? { ...baseScene, culvert: currentCrossSectionCulvert } : null,
    [baseScene, currentCrossSectionCulvert],
  )
  const longitudinalCandidate = useMemo(() => buildHydraulicLongitudinalScene(
    parsedLongitudinal.value,
    {
      conditionLabel,
      configuration: datasetConfiguration,
      summaryRows: parsedSummary.value,
      culverts: longitudinalCulverts,
    },
  ), [conditionLabel, datasetConfiguration, longitudinalCulverts, parsedLongitudinal.value, parsedSummary.value])
  const longitudinalScene = longitudinalGenerated ? longitudinalCandidate : null
  const crossSectionsReady = dataset.sections.length > 0 && dataset.mappingStatus.ready
  const longitudinalReady = Boolean(longitudinalCandidate && longitudinalCandidate.lines.length > 0)
  const ready = view === 'longitudinal' ? longitudinalReady : crossSectionsReady
  const generationLabel = view === 'longitudinal'
    ? `${longitudinalGenerated ? 'Regenerate' : 'Generate'} longitudinal profile`
    : dataset.sections.length > 0
      ? `${scenes.length > 0 ? 'Regenerate' : 'Generate'} ${dataset.sections.length} cross section${dataset.sections.length === 1 ? '' : 's'}`
      : 'Generate cross sections'

  useEffect(() => {
    if (!dataset.sections.some((section) => section.id === selectedSectionId)) {
      const nextSectionId = dataset.sections[0]?.id ?? ''
      if (nextSectionId !== selectedSectionId) setSelectedSectionId(nextSectionId)
    }
  }, [dataset.sections, selectedSectionId, setSelectedSectionId])

  useEffect(() => setScenes([]), [conditionLabel, dataset])
  useEffect(() => setLongitudinalGenerated(false), [longitudinalProfileText, datasetConfiguration])

  useEffect(() => {
    if (hydrationRevision === 0) return
    if (crossSectionsReady) {
      setScenes(dataset.sections.map((section) =>
        hydraulicProfileFigure.buildScene({ conditionLabel, section }),
      ))
    }
    setLongitudinalGenerated(Boolean(longitudinalCandidate?.lines.length))
  }, [conditionLabel, crossSectionsReady, dataset, hydrationRevision, longitudinalCandidate?.lines.length])

  useEffect(() => {
    if (!canvasRef.current) return
    if (view === 'longitudinal' && longitudinalScene) {
      renderHydraulicLongitudinalDocument(canvasRef.current, { scene: longitudinalScene, settings })
    } else if (view === 'cross-sections' && scene) {
      void hydraulicProfileFigure.render({ canvas: canvasRef.current, document: { scene, settings } })
    }
  }, [longitudinalScene, scene, settings, view])

  const appendNotices = useCallback((notices: IngestNotice[]) => {
    if (notices.length > 0) setRuntimeNotices((current) => [...current, ...notices].slice(-20))
  }, [])
  const notices = useMemo(() => {
    const current: IngestNotice[] = []
    if (summaryText.trim()) current.push(...parsedSummary.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (profileText.trim()) current.push(...parsedProfile.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (profileText.trim()) current.push(...dataset.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (longitudinalProfileText.trim()) current.push(...parsedLongitudinal.warnings.map((text) => ({ level: 'warning' as const, text })))
    if (longitudinalProfileText.trim()) current.push(...(longitudinalCandidate?.warnings ?? []).map((text) => ({ level: 'warning' as const, text })))
    return [...current, ...runtimeNotices]
  }, [dataset.warnings, longitudinalCandidate?.warnings, longitudinalProfileText, parsedLongitudinal.warnings, parsedProfile.warnings, parsedSummary.warnings, profileText, runtimeNotices, summaryText])

  const generate = () => {
    try {
      if (view === 'longitudinal') {
        if (!longitudinalCandidate || longitudinalCandidate.lines.length === 0) {
          throw new Error('Add one complete Longitudinal SMS Profile Values set that matches the dataset definitions.')
        }
        setLongitudinalGenerated(true)
        appendNotices([{ level: 'success', text: 'Generated longitudinal hydraulic profile.' }])
        return
      }
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
    if (view === 'longitudinal') {
      if (!longitudinalScene) return null
      return createHydraulicLongitudinalReportFigure(
        longitudinalScene,
        settings,
        createWorkspaceDraftSnapshot(hydraulicProfileWorkspaceDraft, hydraulicProfiles.snapshot),
      )
    }
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
    setLongitudinalGenerated(false)
    setRuntimeNotices([])
    setLeftCollapsed(false)
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
              createFigure={createExportFigure}
              addLabel={view === 'longitudinal' ? 'Add longitudinal profile to export' : 'Add current station to export'}
              addVariant={view === 'cross-sections' && scenes.length > 1 ? 'secondary' : 'primary'}
              onSuccess={(text) => appendNotices([{ level: 'success', text }])}
            />
          }
          generatedCount={view === 'cross-sections' ? scenes.length : 0}
          onAddAllToExport={addAllToExport}
          onDownload={() => {
            if (view === 'longitudinal' && longitudinalScene) downloadHydraulicLongitudinalPng(longitudinalScene, settings)
            else if (scene) downloadHydraulicProfilePng(scene, settings)
          }}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<LineChart size={18} aria-hidden="true" />}
          label={generationLabel}
          disabled={!ready}
          testId="generate-hydraulic-profile"
          hint={!ready
            ? view === 'longitudinal'
              ? 'Add Longitudinal SMS Profile Values matching the dataset definitions'
              : dataset.sections.length > 0
              ? 'Review the dataset mapping before generating'
              : 'Paste and review one complete SMS profile first'
            : undefined}
          onClick={generate}
        />
      }
      />
    </>
  )
}
