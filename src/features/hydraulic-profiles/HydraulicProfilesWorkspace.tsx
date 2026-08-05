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
import type { HydraulicProfileScene, IngestNotice } from '../../core/types'
import { FigurePicker } from '../figures/FigurePicker'
import { downloadHydraulicProfilePng } from './exportHydraulicProfile'
import { HydraulicProfileCanvas } from './HydraulicProfileCanvas'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { HydraulicProfileInputPanel } from './HydraulicProfileInputPanel'
import { HydraulicProfileSettingsPanel } from './HydraulicProfileSettingsPanel'
import { createDefaultHydraulicProfileSettings } from './hydraulicProfileSettings'
import { HYDRAULIC_PROFILE_WORKSPACE_SETTINGS } from './hydraulicProfileSettingsSections'
import { useHydraulicProfileProjectFiles } from './useHydraulicProfileProjectFiles'

const DEFAULT_EVENTS = ['2-year', '100-year', '500-year', '2080 100-year']

export function HydraulicProfilesWorkspace() {
  const [conditionLabel, setConditionLabel] = useState('Proposed Conditions')
  const [eventNames, setEventNames] = useState(DEFAULT_EVENTS)
  const [summaryText, setSummaryText] = useState('')
  const [profileText, setProfileText] = useState('')
  const [groundOverrides, setGroundOverrides] = useState<Record<number, number>>({})
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [settings, setSettings] = useState(createDefaultHydraulicProfileSettings)
  const [scene, setScene] = useState<HydraulicProfileScene | null>(null)
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
    { conditionLabel, eventNames, groundOverrides },
  ), [conditionLabel, eventNames, groundOverrides, parsedProfile.value, parsedSummary.value])
  const selectedSection = dataset.sections.find((section) => section.id === selectedSectionId) ?? null
  const ready = Boolean(selectedSection)

  useEffect(() => {
    if (!dataset.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(dataset.sections[0]?.id ?? '')
    }
  }, [dataset.sections, selectedSectionId])

  useEffect(() => setScene(null), [dataset, selectedSectionId])

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
      const nextScene = hydraulicProfileFigure.buildScene({ conditionLabel, section: selectedSection })
      setScene(nextScene)
      appendNotices([{ level: 'success', text: `Generated hydraulic profile at station ${nextScene.section.stationLabel}.` }])
    } catch (error) {
      appendNotices([{ level: 'error', text: error instanceof Error ? error.message : String(error) }])
    }
  }

  const projectFiles = useHydraulicProfileProjectFiles({
    snapshot: {
      conditionLabel,
      eventNames,
      summaryText,
      profileText,
      selectedSectionId,
      groundOverrides,
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
    setEventNames(payload.eventNames)
    setSummaryText(payload.summaryText)
    setProfileText(payload.profileText)
    setSelectedSectionId(payload.selectedSectionId)
    setGroundOverrides(payload.groundOverrides)
    setSettings(payload.settings)
    setScene(null)
    appendNotices([{ level: 'success', text: 'Hydraulic profile project loaded.' }])
  }

  const reset = () => {
    setConditionLabel('Proposed Conditions')
    setEventNames(DEFAULT_EVENTS)
    setSummaryText('')
    setProfileText('')
    setGroundOverrides({})
    setSelectedSectionId('')
    setSettings(createDefaultHydraulicProfileSettings())
    setScene(null)
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
          eventNames={eventNames}
          summaryText={summaryText}
          profileText={profileText}
          dataset={dataset}
          selectedSectionId={selectedSectionId}
          onConditionLabelChange={setConditionLabel}
          onEventNamesChange={(names) => { setEventNames(names); setGroundOverrides({}) }}
          onSummaryTextChange={setSummaryText}
          onProfileTextChange={(text) => { setProfileText(text); setGroundOverrides({}) }}
          onSelectedSectionChange={setSelectedSectionId}
          onGroundOverride={(sectionIndex, groundIndex) => setGroundOverrides((current) => ({ ...current, [sectionIndex]: groundIndex }))}
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
          onMobileClose={() => setLeftOpen(false)}
          onReset={reset}
        />
      }
      mapContent={<HydraulicProfileCanvas scene={scene} orientation={settings.orientation} canvasRef={canvasRef} />}
      settingsContent={
        <HydraulicProfileSettingsPanel
          section={activeSection}
          settings={settings}
          profileSection={selectedSection}
          canDownload={Boolean(scene)}
          onSettingsChange={setSettings}
          onDownload={() => { if (scene) downloadHydraulicProfilePng(scene, settings) }}
        />
      }
      settingsFooter={
        <WorkspaceActionBar
          icon={<LineChart size={18} aria-hidden="true" />}
          label={scene ? 'Regenerate cross section' : 'Generate cross section'}
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
