import { Download, Images } from 'lucide-react'
import { ControlSection } from '../../components/ControlSection'
import { CompactFieldGrid } from '../../components/settings/CompactFieldGrid'
import type { HydraulicProfileSection } from '../../core/types'
import { Toggle } from '../wse-difference/components/Toggle'
import type { HydraulicProfileSettingsSectionKey } from './hydraulicProfileDefinition'
import type {
  HydraulicProfileFigureSettings,
  HydraulicProfileLineStyle,
} from './hydraulicProfileSettings'

type Props = {
  section: HydraulicProfileSettingsSectionKey
  settings: HydraulicProfileFigureSettings
  profileSection: HydraulicProfileSection | null
  canDownload: boolean
  eventNames: string[]
  onSettingsChange(update: (settings: HydraulicProfileFigureSettings) => HydraulicProfileFigureSettings): void
  onEventNamesChange(names: string[]): void
  onAddToExport(): void
  onDownload(): void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function LineStyleEditor({
  label,
  style,
  onChange,
  onLabelChange,
}: {
  label: string
  style: HydraulicProfileLineStyle
  onChange(style: HydraulicProfileLineStyle): void
  onLabelChange?(label: string): void
}) {
  return (
    <div className="profile-style-row">
      {onLabelChange ? <input aria-label={`${label} legend name`} value={label} onChange={(event) => onLabelChange(event.currentTarget.value)} /> : <strong>{label}</strong>}
      <label><span>Color</span><input aria-label={`${label} color`} type="color" value={style.color} onChange={(event) => onChange({ ...style, color: event.currentTarget.value })} /></label>
      <label><span>Width</span><input aria-label={`${label} width`} type="number" min="0.5" max="8" step="0.25" value={style.width} onChange={(event) => onChange({ ...style, width: Math.max(0.5, Number(event.currentTarget.value) || 0.5) })} /></label>
    </div>
  )
}

export function HydraulicProfileSettingsPanel({
  section,
  settings,
  profileSection,
  canDownload,
  eventNames,
  onSettingsChange,
  onEventNamesChange,
  onAddToExport,
  onDownload,
}: Props) {
  const update = <Key extends keyof HydraulicProfileFigureSettings>(key: Key, value: HydraulicProfileFigureSettings[Key]) =>
    onSettingsChange((current) => ({ ...current, [key]: value }))

  return (
    <ControlSection>
      <div className="profile-settings-stack">
        {section === 'layout' ? <>
          <Field label="Figure title"><input value={settings.title} onChange={(event) => update('title', event.currentTarget.value)} /></Field>
          <div className="segmented" aria-label="Figure orientation">
            {(['landscape', 'portrait'] as const).map((orientation) => <button className={settings.orientation === orientation ? 'active' : ''} type="button" key={orientation} onClick={() => update('orientation', orientation)}>{orientation === 'landscape' ? 'Landscape' : 'Portrait'}</button>)}
          </div>
          <Field label="Looking direction"><select value={settings.lookingDirection} onChange={(event) => update('lookingDirection', event.currentTarget.value as 'downstream' | 'upstream')}><option value="downstream">Downstream</option><option value="upstream">Upstream</option></select></Field>
          <Toggle label="Earth fill" checked={settings.showEarthFill} onChange={(value) => update('showEarthFill', value)} />
          <Toggle label="Inundation shading (first WSE)" checked={settings.showInundation} onChange={(value) => update('showInundation', value)} />
          <Toggle label="Legend" checked={settings.showLegend} onChange={(value) => update('showLegend', value)} />
          <Toggle label="Thalweg label" checked={settings.showThalweg} onChange={(value) => update('showThalweg', value)} />
        </> : null}
        {section === 'lines' ? <>
          <LineStyleEditor label={profileSection?.ground.name ?? 'Ground'} style={settings.groundStyle} onChange={(groundStyle) => update('groundStyle', groundStyle)} />
          {(profileSection?.surfaces ?? []).map((surface, index) => {
            const style = settings.surfaceStyles[index % settings.surfaceStyles.length]
            return <LineStyleEditor label={surface.name} style={style} key={surface.id} onLabelChange={(label) => onEventNamesChange(eventNames.map((name, itemIndex) => itemIndex === index ? label : name))} onChange={(nextStyle) => update('surfaceStyles', settings.surfaceStyles.map((item, itemIndex) => itemIndex === index ? nextStyle : item))} />
          })}
          {!profileSection ? <div className="profile-empty-review">Select a parsed station to style its lines.</div> : null}
        </> : null}
        {section === 'axes' ? <>
          <Toggle label="Grid" checked={settings.showGrid} onChange={(value) => update('showGrid', value)} />
          <div className="field-grid two">
            <Field label="Y minimum"><input aria-label="Y minimum" type="number" step="0.1" placeholder="Auto" value={settings.yMinimum ?? ''} onChange={(event) => update('yMinimum', event.currentTarget.value === '' ? null : Number(event.currentTarget.value))} /></Field>
            <Field label="Y maximum"><input aria-label="Y maximum" type="number" step="0.1" placeholder="Auto" value={settings.yMaximum ?? ''} onChange={(event) => update('yMaximum', event.currentTarget.value === '' ? null : Number(event.currentTarget.value))} /></Field>
          </div>
          <CompactFieldGrid>
            <Field label="Text size"><input type="number" min="12" max="30" value={settings.fontSize} onChange={(event) => update('fontSize', Math.max(12, Number(event.currentTarget.value) || 12))} /></Field>
            <Field label="Text color"><input className="profile-color-input" type="color" value={settings.textColor} onChange={(event) => update('textColor', event.currentTarget.value)} /></Field>
          </CompactFieldGrid>
        </> : null}
        {section === 'export' ? <>
          <button className="button primary full" type="button" disabled={!canDownload} onClick={onAddToExport}><Images size={17} /> Add to export</button>
          <button className="button secondary full" type="button" disabled={!canDownload} onClick={onDownload}><Download size={17} /> Download PNG</button>
        </> : null}
      </div>
    </ControlSection>
  )
}
