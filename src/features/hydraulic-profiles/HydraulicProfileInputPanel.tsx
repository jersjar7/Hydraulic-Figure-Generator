import {
  CheckSquare,
  ClipboardPaste,
  ListPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Settings2,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type {
  HydraulicProfileDataset,
  HydraulicProfileDatasetConfiguration,
  HydraulicProfileLineKind,
  SmsSummaryRow,
} from '../../core/types'
import { analyzeHydraulicProfileStationReferences } from '../../core/hydraulic-profiles/analyzeStationReferences'
import {
  resizeHydraulicProfileDatasetConfiguration,
} from '../../core/hydraulic-profiles/buildHydraulicProfileDataset'
import {
  createHydraulicProfilePresetConfiguration,
  HYDRAULIC_PROFILE_PRESETS,
  matchesHydraulicProfilePreset,
} from './hydraulicProfilePresets'

type InputSection = 'scenario' | 'summary' | 'profile' | 'review'

type Props = {
  mobileOpen: boolean
  collapsed: boolean
  conditionLabel: string
  summaryText: string
  profileText: string
  dataset: HydraulicProfileDataset
  summaryRows: SmsSummaryRow[]
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
  summaryRows,
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
  const referenceScores = analyzeHydraulicProfileStationReferences(
    dataset.sections.flatMap(({ sourceSeries }) => sourceSeries),
    summaryRows,
    dataset.datasetsPerSection,
  )
  const bestReference = referenceScores[0] ?? null
  const selectedReference = referenceScores.find(
    ({ slot }) => slot === dataset.configuration?.stationReferenceSlot,
  ) ?? null

  const updateDefinition = (
    slot: number,
    update: Partial<{ name: string; kind: HydraulicProfileLineKind }>,
  ) => {
    if (!dataset.configuration) return
    const definitions = dataset.configuration.definitions.map((definition) =>
      definition.slot === slot ? { ...definition, ...update } : definition,
    )
    let stationReferenceSlot = dataset.configuration.stationReferenceSlot
    if (update.kind === 'ground' && stationReferenceSlot == null) {
      stationReferenceSlot = slot
    } else if (update.kind && update.kind !== 'ground' && stationReferenceSlot === slot) {
      stationReferenceSlot = definitions.find(({ kind }) => kind === 'ground')?.slot ?? null
    }
    onDatasetConfigurationChange({
      ...dataset.configuration,
      definitions,
      stationReferenceSlot,
    })
  }

  const assignStationGround = (slot: number) => {
    if (!dataset.configuration) return
    onDatasetConfigurationChange({
      ...dataset.configuration,
      stationReferenceSlot: slot,
      definitions: dataset.configuration.definitions.map((definition) =>
        definition.slot === slot ? { ...definition, kind: 'ground' } : definition,
      ),
    })
  }

  const addDataset = () => {
    const count = (dataset.configuration?.datasetsPerSection ?? dataset.datasetsPerSection) + 1
    onDatasetConfigurationChange(
      resizeHydraulicProfileDatasetConfiguration(dataset.configuration, Math.max(1, count)),
    )
  }

  const removeDataset = (slot: number) => {
    const configuration = dataset.configuration
    if (!configuration || configuration.datasetsPerSection <= 1) return
    const definitions = configuration.definitions
      .filter((definition) => definition.slot !== slot)
      .map((definition, nextSlot) => ({ ...definition, slot: nextSlot }))
    const reference = configuration.stationReferenceSlot
    onDatasetConfigurationChange({
      datasetsPerSection: definitions.length,
      definitions,
      stationReferenceSlot: reference == null || reference === slot
        ? null
        : reference > slot
          ? reference - 1
          : reference,
    })
  }

  const applyPreset = (presetId: 'existing' | 'proposed') => {
    const preset = HYDRAULIC_PROFILE_PRESETS.find(({ id }) => id === presetId)!
    onConditionLabelChange(preset.conditionLabel)
    onDatasetConfigurationChange(createHydraulicProfilePresetConfiguration(presetId))
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
            <div className="profile-input-header"><strong>Dataset preset</strong><small>Starting point</small></div>
            <div className="profile-preset-buttons" role="group" aria-label="Dataset preset">
              {HYDRAULIC_PROFILE_PRESETS.map((preset) => (
                <button
                  className={`button compact${matchesHydraulicProfilePreset(dataset.configuration, preset.id) ? ' active' : ' secondary'}`}
                  type="button"
                  aria-pressed={matchesHydraulicProfilePreset(dataset.configuration, preset.id)}
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="profile-input-header">
              <strong>Datasets per cross section</strong>
              <button className="button secondary compact" type="button" onClick={addDataset}><Plus size={14} /> Add dataset</button>
            </div>
            <div className="profile-scenario-dataset-list">
              {dataset.configuration?.definitions.map((definition) => (
                <div className="profile-scenario-dataset-row" key={definition.slot}>
                  <span>{definition.slot + 1}</span>
                  <input aria-label={`Scenario dataset ${definition.slot + 1} legend name`} value={definition.name} onChange={(event) => updateDefinition(definition.slot, { name: event.currentTarget.value })} />
                  <select aria-label={`Scenario dataset ${definition.slot + 1} type`} value={definition.kind} onChange={(event) => updateDefinition(definition.slot, { kind: event.currentTarget.value as HydraulicProfileLineKind })}><option value="ground">Ground</option><option value="wse">WSE</option><option value="other">Other</option></select>
                  <button className="icon-button danger" type="button" title="Remove dataset" aria-label={`Remove dataset ${definition.slot + 1}`} disabled={dataset.configuration!.datasetsPerSection <= 1} onClick={() => removeDataset(definition.slot)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className={`profile-structure-status ${dataset.structureSource}`}>
              {dataset.inferredDatasetsPerSection != null && dataset.inferredDatasetsPerSection !== dataset.datasetsPerSection
                ? `The pasted data indicates ${dataset.inferredDatasetsPerSection} datasets per section, but ${dataset.datasetsPerSection} are configured. Add or remove datasets to match the paste.`
                : dataset.seriesCount > 0
                  ? `${dataset.seriesCount} profile series produce ${dataset.sections.length} cross sections with ${dataset.datasetsPerSection} datasets each.`
                  : `${dataset.datasetsPerSection} datasets are configured. Paste the Summary Table and Profile Values next.`}
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
              <label className="field"><span title="The app compares this ground profile's minimum elevation with each Summary Table Z-min to assign station labels.">Ground used to assign station labels</span><select aria-label="Ground used to assign station labels" value={dataset.configuration.stationReferenceSlot ?? ''} onChange={(event) => event.currentTarget.value === '' ? onDatasetConfigurationChange({ ...dataset.configuration!, stationReferenceSlot: null }) : assignStationGround(Number(event.currentTarget.value))}><option value="">Choose a dataset</option>{dataset.configuration.definitions.map((definition) => {
                const score = referenceScores.find(({ slot }) => slot === definition.slot)
                return <option value={definition.slot} key={definition.slot}>{`Dataset ${definition.slot + 1}: ${definition.name}${score && Number.isFinite(score.meanAbsoluteDifference) ? ` · avg Z-min difference ${score.meanAbsoluteDifference.toFixed(2)} ft` : ''}`}</option>
              })}</select></label>
              {bestReference && selectedReference && bestReference.slot !== selectedReference.slot && bestReference.meanAbsoluteDifference + 0.25 < selectedReference.meanAbsoluteDifference ? (
                <div className="profile-reference-suggestion">
                  <span>Best Summary Z-min match: Dataset {bestReference.slot + 1} ({bestReference.meanAbsoluteDifference.toFixed(2)} ft average difference)</span>
                  <button className="button secondary compact" type="button" onClick={() => assignStationGround(bestReference.slot)}>Use Dataset {bestReference.slot + 1} as ground</button>
                </div>
              ) : null}
              <div className="profile-definition-list">
                {dataset.configuration.definitions.map((definition) => (
                  <div className="profile-definition-row" key={definition.slot}>
                    <span>Dataset {definition.slot + 1}</span>
                    <input aria-label={`Dataset ${definition.slot + 1} legend name`} value={definition.name} onChange={(event) => updateDefinition(definition.slot, { name: event.currentTarget.value })} />
                    <select aria-label={`Dataset ${definition.slot + 1} type`} value={definition.kind} onChange={(event) => updateDefinition(definition.slot, { kind: event.currentTarget.value as HydraulicProfileLineKind })}><option value="ground">Ground</option><option value="wse">WSE</option><option value="other">Other</option></select>
                    <small>Min {seriesMinimum(selected.sourceSeries[definition.slot]?.elevations ?? [])} ft{bestReference?.slot === definition.slot ? ' · Best Summary Z-min match' : ''}</small>
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
