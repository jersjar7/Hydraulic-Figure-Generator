import {
  CheckSquare,
  ClipboardPaste,
  ListPlus,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings2,
  Table2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type {
  HydraulicProfileDataset,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileLineKind,
} from '../../core/types'
import {
  resizeHydraulicProfileDatasetConfiguration,
} from '../../core/hydraulic-profiles/buildHydraulicProfileDataset'

type InputSection = 'scenario' | 'summary' | 'profile' | 'review'

type Props = {
  mobileOpen: boolean
  collapsed: boolean
  conditionLabel: string
  summaryText: string
  profileText: string
  dataset: HydraulicProfileDataset
  selectedSectionId: string
  onConditionLabelChange(value: string): void
  onSummaryTextChange(value: string): void
  onProfileTextChange(value: string): void
  onSelectedSectionChange(id: string): void
  onDatasetConfigurationChange(configuration: HydraulicProfileDatasetConfiguration | null): void
  onCollapse(): void
  onExpand(): void
  onMobileClose(): void
  onReset(): void
}

const SECTIONS = [
  { key: 'scenario', label: 'Scenario', icon: Settings2 },
  { key: 'summary', label: 'Summary', icon: Table2 },
  { key: 'profile', label: 'Profile', icon: ClipboardPaste },
  { key: 'review', label: 'Review', icon: CheckSquare },
] as const

function seriesMinimum(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value != null)
  return valid.length > 0 ? Math.min(...valid).toFixed(2) : 'n/a'
}

export function HydraulicProfileInputPanel({
  mobileOpen,
  collapsed,
  conditionLabel,
  summaryText,
  profileText,
  dataset,
  selectedSectionId,
  onConditionLabelChange,
  onSummaryTextChange,
  onProfileTextChange,
  onSelectedSectionChange,
  onDatasetConfigurationChange,
  onCollapse,
  onExpand,
  onMobileClose,
  onReset,
}: Props) {
  const [active, setActive] = useState<InputSection>('scenario')
  const selected = dataset.sections.find((section) => section.id === selectedSectionId) ?? null

  const updateDefinition = (
    slot: number,
    update: Partial<{ name: string; kind: HydraulicProfileLineKind }>,
  ) => {
    if (!dataset.configuration) return
    onDatasetConfigurationChange({
      ...dataset.configuration,
      definitions: dataset.configuration.definitions.map((definition) =>
        definition.slot === slot ? { ...definition, ...update } : definition,
      ),
    })
  }

  if (collapsed) {
    return (
      <aside className="sidebar left-sidebar is-collapsed">
        <nav className="project-workflow-rail" aria-label="Profile inputs">
          <button className="icon-button project-rail-expand" type="button" title="Expand profile inputs" aria-label="Expand profile inputs" onClick={onExpand}>
            <PanelLeftOpen size={18} />
          </button>
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button className={`project-rail-tab${active === key ? ' active' : ''}`} type="button" title={label} aria-label={label} key={key} onClick={() => { setActive(key); onExpand() }}>
              <Icon size={17} />
            </button>
          ))}
        </nav>
      </aside>
    )
  }

  return (
    <aside className={`sidebar left-sidebar${mobileOpen ? ' is-mobile-open' : ''}`}>
      <div className="sidebar-heading project-sidebar-heading">
        <div><span className="eyebrow">Inputs</span><h2>Profile data</h2></div>
        <div className="sidebar-heading-actions">
          <button className="icon-button desktop-collapse" type="button" title="Collapse profile inputs" aria-label="Collapse profile inputs" onClick={onCollapse}><PanelLeftClose size={18} /></button>
          <button className="icon-button mobile-close" type="button" title="Close profile inputs" aria-label="Close profile inputs" onClick={onMobileClose}><X size={18} /></button>
        </div>
      </div>
      <nav className="profile-input-tabs" role="tablist" aria-label="Hydraulic profile inputs">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button className={active === key ? 'active' : ''} type="button" role="tab" aria-selected={active === key} title={label} key={key} onClick={() => setActive(key)}>
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="project-workflow-content profile-input-content">
        {active === 'scenario' ? (
          <div className="profile-input-stack">
            <label className="field"><span>Condition label</span><input aria-label="Condition label" value={conditionLabel} onChange={(event) => onConditionLabelChange(event.currentTarget.value)} /></label>
            <div className="profile-input-header"><strong>Dataset structure</strong>{dataset.structureSource === 'configured' ? <button className="button ghost compact" type="button" onClick={() => onDatasetConfigurationChange(null)}>Use auto</button> : null}</div>
            <label className="field"><span>Datasets per cross section</span><input aria-label="Datasets per cross section" type="number" min="1" max="30" placeholder="Auto" value={dataset.datasetsPerSection || ''} onChange={(event) => {
              const count = Math.max(1, Math.floor(Number(event.currentTarget.value) || 1))
              onDatasetConfigurationChange(resizeHydraulicProfileDatasetConfiguration(dataset.configuration, count))
            }} /></label>
            <div className={`profile-structure-status ${dataset.structureSource}`}>
              {dataset.structureSource === 'summary'
                ? `Detected ${dataset.datasetsPerSection} datasets per section from ${dataset.seriesCount} profile series and ${dataset.sections.length} Summary Table stations.`
                : dataset.structureSource === 'configured'
                  ? `Using the engineer-specified block size of ${dataset.datasetsPerSection} datasets per section.`
                  : 'Paste a Summary Table and Profile Values, or enter the dataset count.'}
            </div>
          </div>
        ) : null}
        {active === 'summary' ? (
          <div className="profile-input-stack">
            <label className="field"><span>SMS Summary Table</span><textarea className="profile-paste" aria-label="SMS Summary Table" spellCheck={false} value={summaryText} onChange={(event) => onSummaryTextChange(event.currentTarget.value)} /></label>
            <div className="profile-parse-status"><Table2 size={16} /><span>{dataset.sections.filter((section) => section.station != null).length} station labels paired</span></div>
          </div>
        ) : null}
        {active === 'profile' ? (
          <div className="profile-input-stack">
            <label className="field"><span>SMS Profile Values</span><textarea className="profile-paste large" aria-label="SMS Profile Values" spellCheck={false} value={profileText} onChange={(event) => onProfileTextChange(event.currentTarget.value)} /></label>
            <div className="profile-parse-status"><ListPlus size={16} /><span>{dataset.seriesCount} series parsed · {dataset.sections.length} cross sections detected</span></div>
          </div>
        ) : null}
        {active === 'review' ? (
          <div className="profile-input-stack">
            <label className="field"><span>Station</span><select aria-label="Profile station" value={selectedSectionId} onChange={(event) => onSelectedSectionChange(event.currentTarget.value)}><option value="">Choose a station</option>{dataset.sections.map((section) => <option value={section.id} key={section.id}>{section.stationLabel}</option>)}</select></label>
            {selected && dataset.configuration ? <>
              <div className="profile-input-header"><strong>Dataset definitions</strong><small>Apply to every station</small></div>
              <label className="field"><span>Match stations using</span><select aria-label="Station reference dataset" value={dataset.configuration.stationReferenceSlot ?? ''} onChange={(event) => onDatasetConfigurationChange({ ...dataset.configuration!, stationReferenceSlot: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })}><option value="">Choose a dataset</option>{dataset.configuration.definitions.map((definition) => <option value={definition.slot} key={definition.slot}>{definition.name} (min {seriesMinimum(selected.sourceSeries[definition.slot]?.elevations ?? [])} ft)</option>)}</select></label>
              <div className="profile-definition-list">
                {dataset.configuration.definitions.map((definition) => (
                  <div className="profile-definition-row" key={definition.slot}>
                    <span>Dataset {definition.slot + 1}</span>
                    <input aria-label={`Dataset ${definition.slot + 1} legend name`} value={definition.name} onChange={(event) => updateDefinition(definition.slot, { name: event.currentTarget.value })} />
                    <select aria-label={`Dataset ${definition.slot + 1} type`} value={definition.kind} onChange={(event) => updateDefinition(definition.slot, { kind: event.currentTarget.value as HydraulicProfileLineKind })}><option value="ground">Ground</option><option value="wse">WSE</option><option value="other">Other</option></select>
                    <small>Min {seriesMinimum(selected.sourceSeries[definition.slot]?.elevations ?? [])} ft</small>
                  </div>
                ))}
              </div>
            </> : <div className="profile-empty-review">Paste profile values and define the datasets per section to review the lines.</div>}
          </div>
        ) : null}
      </div>
      <div className="project-workflow-footer"><button className="button ghost compact" type="button" onClick={onReset}><RotateCcw size={14} /> Reset profile</button></div>
    </aside>
  )
}
