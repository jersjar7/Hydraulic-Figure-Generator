import {
  ArrowDown,
  ArrowUp,
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
import type { HydraulicProfileDataset } from '../../core/types'

type InputSection = 'scenario' | 'summary' | 'profile' | 'review'

type Props = {
  mobileOpen: boolean
  collapsed: boolean
  conditionLabel: string
  eventNames: string[]
  summaryText: string
  profileText: string
  dataset: HydraulicProfileDataset
  selectedSectionId: string
  onConditionLabelChange(value: string): void
  onEventNamesChange(value: string[]): void
  onSummaryTextChange(value: string): void
  onProfileTextChange(value: string): void
  onSelectedSectionChange(id: string): void
  onGroundOverride(sectionIndex: number, groundIndex: number): void
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
  eventNames,
  summaryText,
  profileText,
  dataset,
  selectedSectionId,
  onConditionLabelChange,
  onEventNamesChange,
  onSummaryTextChange,
  onProfileTextChange,
  onSelectedSectionChange,
  onGroundOverride,
  onCollapse,
  onExpand,
  onMobileClose,
  onReset,
}: Props) {
  const [active, setActive] = useState<InputSection>('scenario')
  const selected = dataset.sections.find((section) => section.id === selectedSectionId) ?? null

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

  const moveEvent = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= eventNames.length) return
    const next = [...eventNames]
    ;[next[index], next[target]] = [next[target], next[index]]
    onEventNamesChange(next)
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
            <div className="profile-input-header"><strong>WSE events</strong><button className="button secondary compact" type="button" onClick={() => onEventNamesChange([...eventNames, `Event ${eventNames.length + 1}`])}><Plus size={14} /> Add</button></div>
            <div className="profile-event-list">
              {eventNames.map((name, index) => (
                <div className="profile-event-row" key={`${index}-${name}`}>
                  <span>{index + 1}</span>
                  <input aria-label={`WSE event ${index + 1}`} value={name} onChange={(event) => onEventNamesChange(eventNames.map((item, itemIndex) => itemIndex === index ? event.currentTarget.value : item))} />
                  <button className="icon-button" type="button" title="Move event up" aria-label={`Move event ${index + 1} up`} disabled={index === 0} onClick={() => moveEvent(index, -1)}><ArrowUp size={14} /></button>
                  <button className="icon-button" type="button" title="Move event down" aria-label={`Move event ${index + 1} down`} disabled={index === eventNames.length - 1} onClick={() => moveEvent(index, 1)}><ArrowDown size={14} /></button>
                  <button className="icon-button danger" type="button" title="Remove event" aria-label={`Remove event ${index + 1}`} disabled={eventNames.length === 1} onClick={() => onEventNamesChange(eventNames.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button>
                </div>
              ))}
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
            <div className="profile-parse-status"><ListPlus size={16} /><span>{dataset.sections.length} cross sections detected</span></div>
          </div>
        ) : null}
        {active === 'review' ? (
          <div className="profile-input-stack">
            <label className="field"><span>Station</span><select aria-label="Profile station" value={selectedSectionId} onChange={(event) => onSelectedSectionChange(event.currentTarget.value)}><option value="">Choose a station</option>{dataset.sections.map((section) => <option value={section.id} key={section.id}>{section.stationLabel}</option>)}</select></label>
            {selected ? <>
              <label className="field"><span>Ground dataset</span><select aria-label="Ground dataset" value={selected.groundSourceIndex} onChange={(event) => onGroundOverride(selected.sourceIndex, Number(event.currentTarget.value))}>{selected.sourceSeries.map((series, index) => <option value={index} key={series.id}>Dataset {series.sourceIndex + 1} (min {seriesMinimum(series.elevations)} ft)</option>)}</select></label>
              <div className="profile-mapping-list">
                <div><span className="profile-line-swatch ground" /><strong>{selected.ground.name}</strong><small>Dataset {selected.ground.sourceIndex + 1}</small></div>
                {selected.surfaces.map((surface) => <div key={surface.id}><span className="profile-line-swatch" /><strong>{surface.name}</strong><small>Dataset {surface.sourceIndex + 1}</small></div>)}
              </div>
            </> : <div className="profile-empty-review">Paste profile values to review the detected lines.</div>}
          </div>
        ) : null}
      </div>
      <div className="project-workflow-footer"><button className="button ghost compact" type="button" onClick={onReset}><RotateCcw size={14} /> Reset profile</button></div>
    </aside>
  )
}
