import { Download, Images } from 'lucide-react'
import type { ReactNode } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { Toggle } from '../../components/settings/Toggle'
import type {
  HydraulicProfileDatasetConfiguration,
  HydraulicCrossSectionCulvert,
  HydraulicLongitudinalCulvert,
  HydraulicLongitudinalScene,
  HydraulicProfileSection,
  HydraulicProfileView,
} from '../../core/types'
import { ChartAxesControls } from '../chart-tools/ChartAxesControls'
import { ChartLayoutControls } from '../chart-tools/ChartLayoutControls'
import { LongitudinalStationingControls } from '../chart-tools/LongitudinalStationingControls'
import { ChartSeriesControls } from '../chart-tools/ChartSeriesControls'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import { HydraulicProfileStructuresPanel } from './HydraulicProfileStructuresPanel'
import {
  applyHydraulicProfileChartAxes,
  applyHydraulicProfileChartLayout,
  applyHydraulicProfileChartLegend,
  hydraulicProfileChartAxes,
  hydraulicProfileChartLayout,
  hydraulicProfileChartLegend,
  hydraulicProfileChartSeries,
  moveHydraulicProfileSeries,
  updateHydraulicProfileLineStyle,
  updateHydraulicProfileLineVisibility,
} from './hydraulicProfileChartStyle'

type Props = {
  section: HydraulicProfileSettingsSectionKey
  settings: HydraulicProfileFigureSettings
  profileSection: HydraulicProfileSection | null
  canDownload: boolean
  datasetConfiguration: HydraulicProfileDatasetConfiguration | null
  view: HydraulicProfileView
  longitudinalScene: HydraulicLongitudinalScene | null
  crossSectionCulvert: HydraulicCrossSectionCulvert | null
  longitudinalCulverts: HydraulicLongitudinalCulvert[]
  exportActions: ReactNode
  onSettingsChange(update: (settings: HydraulicProfileFigureSettings) => HydraulicProfileFigureSettings): void
  onDatasetConfigurationChange(configuration: HydraulicProfileDatasetConfiguration): void
  onCrossSectionCulvertChange(culvert: HydraulicCrossSectionCulvert | null): void
  onLongitudinalCulvertsChange(culverts: HydraulicLongitudinalCulvert[]): void
  generatedCount: number
  onAddAllToExport(): void
  onDownload(): void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function HydraulicProfileSettingsPanel({
  section,
  settings,
  profileSection,
  canDownload,
  datasetConfiguration,
  view,
  longitudinalScene,
  crossSectionCulvert,
  longitudinalCulverts,
  exportActions,
  onSettingsChange,
  onDatasetConfigurationChange,
  onCrossSectionCulvertChange,
  onLongitudinalCulvertsChange,
  generatedCount,
  onAddAllToExport,
  onDownload,
}: Props) {
  const update = <Key extends keyof HydraulicProfileFigureSettings>(key: Key, value: HydraulicProfileFigureSettings[Key]) =>
    onSettingsChange((current) => ({ ...current, [key]: value }))
  const updateLineName = (slot: number, name: string) => {
    if (!datasetConfiguration) return
    onDatasetConfigurationChange({
      ...datasetConfiguration,
      definitions: datasetConfiguration.definitions.map((definition) =>
        definition.slot === slot ? { ...definition, name } : definition,
      ),
    })
  }
  const profileLines = view === 'longitudinal'
    ? longitudinalScene?.lines ?? []
    : profileSection?.lines ?? []
  const grounds = view === 'longitudinal'
    ? longitudinalScene?.grounds ?? []
    : profileSection?.grounds ?? []
  const surfaces = view === 'longitudinal'
    ? longitudinalScene?.surfaces ?? []
    : profileSection?.surfaces ?? []
  const primaryGroundSlot = profileSection?.primaryGround?.datasetSlot ?? grounds[0]?.datasetSlot ?? null

  return (
    <ControlSection>
      <div className="profile-settings-stack">
        {section === 'layout' ? <>
          <ChartLayoutControls
            layout={hydraulicProfileChartLayout(settings)}
            legend={hydraulicProfileChartLegend(settings)}
            onLayoutChange={(value) => onSettingsChange((current) => applyHydraulicProfileChartLayout(current, value))}
            onLegendChange={(value) => onSettingsChange((current) => applyHydraulicProfileChartLegend(current, value))}
          />
          {view === 'cross-sections' ? <Field label="Looking direction"><select value={settings.lookingDirection} onChange={(event) => update('lookingDirection', event.currentTarget.value as 'downstream' | 'upstream')}><option value="downstream">Downstream</option><option value="upstream">Upstream</option></select></Field> : null}
          {view === 'cross-sections' ? <Field label="WSE extent"><select value={settings.clipWseAtGround ? 'clip' : 'raw'} onChange={(event) => update('clipWseAtGround', event.currentTarget.value === 'clip')}><option value="clip">Clip at ground</option><option value="raw">Raw SMS</option></select></Field> : null}
          {settings.clipWseAtGround && grounds.length > 1 ? <Field label="WSE clipping ground"><select value={settings.wseClippingGroundSlot ?? primaryGroundSlot ?? ''} onChange={(event) => update('wseClippingGroundSlot', Number(event.currentTarget.value))}>{grounds.map((line) => <option value={line.datasetSlot} key={line.id}>{line.name}</option>)}</select></Field> : null}
          <Toggle label="Earth fill" checked={settings.showEarthFill} onChange={(value) => update('showEarthFill', value)} />
          {settings.showEarthFill && grounds.length > 1 ? <Field label="Earth-fill ground"><select value={settings.earthFillGroundSlot ?? primaryGroundSlot ?? ''} onChange={(event) => update('earthFillGroundSlot', Number(event.currentTarget.value))}>{grounds.map((line) => <option value={line.datasetSlot} key={line.id}>{line.name}</option>)}</select></Field> : null}
          <Toggle label="Inundation shading" checked={settings.showInundation} onChange={(value) => update('showInundation', value)} />
          {settings.showInundation && grounds.length > 1 ? <Field label="Shading ground"><select value={settings.inundationGroundSlot ?? primaryGroundSlot ?? ''} onChange={(event) => update('inundationGroundSlot', Number(event.currentTarget.value))}>{grounds.map((line) => <option value={line.datasetSlot} key={line.id}>{line.name}</option>)}</select></Field> : null}
          {settings.showInundation && surfaces.length > 1 ? <Field label="Shading WSE"><select value={settings.inundationSurfaceSlot ?? surfaces[0].datasetSlot} onChange={(event) => update('inundationSurfaceSlot', Number(event.currentTarget.value))}>{surfaces.map((line) => <option value={line.datasetSlot} key={line.id}>{line.name}</option>)}</select></Field> : null}
          {view === 'cross-sections' ? <Toggle label="Thalweg label" checked={settings.showThalweg} onChange={(value) => update('showThalweg', value)} /> : null}
        </> : null}
        {section === 'lines' ? <>
          <ChartSeriesControls
            series={hydraulicProfileChartSeries(settings, profileLines)}
            onLabelChange={updateLineName}
            onStyleChange={(slot, style) => onSettingsChange((current) => updateHydraulicProfileLineStyle(current, slot, style))}
            onVisibilityChange={(slot, visible) => onSettingsChange((current) => updateHydraulicProfileLineVisibility(current, slot, visible))}
            onMove={(slot, direction) => onSettingsChange((current) => moveHydraulicProfileSeries(current, profileLines, slot, direction))}
          />
        </> : null}
        {section === 'axes' ? <>
          <ChartAxesControls
            axes={hydraulicProfileChartAxes(settings)}
            onChange={(value) => onSettingsChange((current) => applyHydraulicProfileChartAxes(current, value))}
          />
          {view === 'longitudinal' ? (
            <LongitudinalStationingControls
              settings={settings.longitudinalStationing}
              onChange={(value) => update('longitudinalStationing', value)}
            />
          ) : null}
        </> : null}
        {section === 'structures' ? (
          <HydraulicProfileStructuresPanel
            view={view}
            section={profileSection}
            longitudinalScene={longitudinalScene}
            crossSectionCulvert={crossSectionCulvert}
            longitudinalCulverts={longitudinalCulverts}
            onCrossSectionCulvertChange={onCrossSectionCulvertChange}
            onLongitudinalCulvertsChange={onLongitudinalCulvertsChange}
          />
        ) : null}
        {section === 'export' ? <>
          {generatedCount > 1 ? <button className="button primary full" type="button" disabled={!canDownload} onClick={onAddAllToExport}><Images size={17} /> Add all {generatedCount} stations to export</button> : null}
          {exportActions}
          <button className="button secondary full" type="button" disabled={!canDownload} onClick={onDownload}><Download size={17} /> Download PNG</button>
        </> : null}
      </div>
    </ControlSection>
  )
}
