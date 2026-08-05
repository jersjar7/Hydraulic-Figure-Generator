import { LineChart } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileScene,
  IngestNotice,
} from '../../core/types'
import { FigurePicker } from '../figures/FigurePicker'
import { useHydraulicProjectWorkspace } from '../project-workspace/useHydraulicProjectWorkspace'
import { downloadHydraulicProfilePng } from './exportHydraulicProfile'
import { HydraulicProfileCanvas } from './HydraulicProfileCanvas'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { createHydraulicProfileReportFigure } from './hydraulicProfileReportAdapter'
import { HydraulicProfileInputPanel } from './HydraulicProfileInputPanel'
import { HydraulicProfileSettingsPanel } from './HydraulicProfileSettingsPanel'
import { createDefaultHydraulicProfileSettings } from './hydraulicProfileSettings'
import { createHydraulicProfilePresetConfiguration } from './hydraulicProfilePresets'
import { HYDRAULIC_PROFILE_WORKSPACE_SETTINGS } from './hydraulicProfileSettingsSections'
import { useHydraulicProfileProjectFiles } from './useHydraulicProfileProjectFiles'

export function HydraulicProfilesWorkspace() {
  const { reportAssembly } = useHydraulicProjectWorkspace()
  const [conditionLabel, setConditionLabel] = useState('Proposed Conditions')
  const [summaryText, setSummaryText] = useState('')
  const [profileText, setProfileText] = useState('')
  const [datasetConfiguration, setDatasetConfiguration] = useState<HydraulicProfileDatasetConfiguration | null>(
    () => createHydraulicProfilePresetConfiguration('proposed'),
  )
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [settings, setSettings] = useState(createDefaultHydraulicProfileSettings)
  const [scenes, setScenes] = useState<HydraulicProfileScene[]>([])
  const [runtimeNotices, setRuntimeNotices] = useState<IngestNotice[]>([])
  const [leftOpen, setLeftOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<HydraulicProfileSettingsSectionKey>('layout')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  const parsedSummary = useMemo(() => parseSmsSummaryTable(summaryText), [summaryText])
  const parsedProfile = useMemo(() => parseSmsProfileValues(profileText), [profileText])
  const dataset = useMemo(() => buildHydraulicProfileDataset(
    parsedProfile.value,
    parsedSummary.value,
    { datasetConfiguration },
  ), [datasetConfiguration, parsedProfile.value, parsedSummary.value])
  const selectedSection = dataset.sections.find((section) => section.id === selectedSectionId) ?? null
  const scene = scenes.find(({ section }) => section.id === selectedSectionId) ?? scenes[0] ?? null
  const ready = dataset.sections.length > 0
  const generationLabel = dataset.sections.length > 0
    ? `${scenes.length > 0 ? 'Regenerate' : 'Generate'} ${dataset.sections.length} cross section${dataset.sections.length === 1 ? '' : 's'}`
    : 'Generate cross sections'

  useEffect(() => {
    if (!dataset.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(dataset.sections[0]?.id ?? '')
    }
  }, [dataset.sections, selectedSectionId])

  useEffect(() => setScenes([]), [conditionLabel, dataset])

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

  const addToExport = () => {
    if (!scene) return
    const figure = reportAssembly.addFigure(
      createHydraulicProfileReportFigure({ scene, settings }),
    )
    appendNotices([{
      level: 'success',
      text: `${figure.title} was added to the Export Collection.`,
    }])
  }

  const addAllToExport = () => {
    if (scenes.length === 0) return
    scenes.forEach((generatedScene) => {
      reportAssembly.addFigure(
        createHydraulicProfileReportFigure({ scene: generatedScene, settings }),
      )
    })
    appendNotices([{
      level: 'success',
      text: `${scenes.length} hydraulic cross sections were added to the Export Collection.`,
    }])
  }

  const projectFiles = useHydraulicProfileProjectFiles({
    snapshot: {
      conditionLabel,
      summaryText,
      profileText,
      selectedSectionId,
      datasetConfiguration,
      settings,
    },
    appendNotices,
  })

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const payload = await projectFiles.loadProjectFile(file)
    if (!payload) return
    setConditionLabel(payload.conditionLabel)
    setSummaryText(payload.summaryText)
    setProfileText(payload.profileText)
    setSelectedSectionId(payload.selectedSectionId)
    setDatasetConfiguration(
      payload.datasetConfiguration ?? createHydraulicProfilePresetConfiguration('proposed'),
    )
    setSettings(payload.settings)
    setScenes([])
    appendNotices([{ level: 'success', text: 'Hydraulic profile project loaded.' }])
  }

  const reset = () => {
    setConditionLabel('Proposed Conditions')
    setSummaryText('')
    setProfileText('')
    setDatasetConfiguration(createHydraulicProfilePresetConfiguration('proposed'))
    setSelectedSectionId('')
    setSettings(createDefaultHydraulicProfileSettings())
    setScenes([])
    setRuntimeNotices([])
    setLeftCollapsed(false)
  }

  return (
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
      onSave={projectFiles.saveProject}
      onLoad={() => projectInputRef.current?.click()}
      onOpenLeftPanel={() => { setLeftCollapsed(false); setLeftOpen(true) }}
      onOpenRightPanel={() => setRightOpen(true)}
      onCloseMobilePanels={() => { setLeftOpen(false); setRightOpen(false) }}
      onCloseSettingsPanel={() => setRightOpen(false)}
      onSettingsSectionChange={setActiveSection}
      onZoomOut={() => undefined}
      onZoomIn={() => undefined}
      onFitFrame={() => undefined}
      loadInput={<input ref={projectInputRef} className="visually-hidden" type="file" accept=".hydfig,.json" onChange={loadProject} />}
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
          onAddToExport={addToExport}
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
          hint={!ready ? 'Paste and review one complete SMS profile first' : undefined}
          onClick={generate}
        />
      }
      figurePicker={<FigurePicker />}
    />
  )
}
