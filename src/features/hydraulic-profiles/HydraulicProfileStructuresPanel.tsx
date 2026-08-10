import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { chartLineDash, chartLinePattern } from '../../core/chartStyle'
import type {
  HydraulicCrossSectionCulvert,
  HydraulicCulvertKind,
  HydraulicLongitudinalCulvert,
  HydraulicLongitudinalScene,
  HydraulicProfileSection,
  HydraulicProfileView,
} from '../../core/types'
import {
  createDefaultCrossSectionCulvert,
  createDefaultLongitudinalCulvert,
} from './hydraulicProfileCulverts'

type Props = {
  view: HydraulicProfileView
  section: HydraulicProfileSection | null
  longitudinalScene: HydraulicLongitudinalScene | null
  crossSectionCulvert: HydraulicCrossSectionCulvert | null
  longitudinalCulverts: HydraulicLongitudinalCulvert[]
  onCrossSectionCulvertChange(culvert: HydraulicCrossSectionCulvert | null): void
  onLongitudinalCulvertsChange(culverts: HydraulicLongitudinalCulvert[]): void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function HydraulicProfileStructuresPanel({
  view,
  section,
  longitudinalScene,
  crossSectionCulvert,
  longitudinalCulverts,
  onCrossSectionCulvertChange,
  onLongitudinalCulvertsChange,
}: Props) {
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => {
    if (!longitudinalCulverts.some(({ id }) => id === selectedId)) {
      setSelectedId(longitudinalCulverts[0]?.id ?? '')
    }
  }, [longitudinalCulverts, selectedId])
  const selected = longitudinalCulverts.find(({ id }) => id === selectedId) ?? null
  const updateCross = (update: Partial<HydraulicCrossSectionCulvert>) => {
    if (crossSectionCulvert) onCrossSectionCulvertChange({ ...crossSectionCulvert, ...update })
  }
  const updateLongitudinal = (update: Partial<HydraulicLongitudinalCulvert>) => {
    if (!selected) return
    onLongitudinalCulvertsChange(longitudinalCulverts.map((culvert) =>
      culvert.id === selected.id ? { ...culvert, ...update } : culvert,
    ))
  }

  if (view === 'cross-sections') {
    return (
      <div className="profile-settings-stack">
        <Field label="Culvert at selected station">
          <select
            aria-label="Culvert at selected station"
            value={crossSectionCulvert?.kind ?? ''}
            disabled={!section}
            onChange={(event) => {
              const kind = event.currentTarget.value as HydraulicCulvertKind | ''
              onCrossSectionCulvertChange(section && kind ? createDefaultCrossSectionCulvert(section, kind) : null)
            }}
          >
            <option value="">None</option>
            <option value="box">Box</option>
            <option value="arch">Arch</option>
            <option value="circle">Circular</option>
            <option value="ellipse">Ellipse</option>
          </select>
        </Field>
        {crossSectionCulvert ? <>
          <Field label="Legend name"><input value={crossSectionCulvert.name} onChange={(event) => updateCross({ name: event.currentTarget.value })} /></Field>
          <div className="field-grid two">
            <Field label="Scour (ft)"><input type="number" step="0.1" value={crossSectionCulvert.scour} onChange={(event) => updateCross({ scour: Number(event.currentTarget.value) || 0 })} /></Field>
            <Field label="Bed (ft)"><input type="number" min="0" step="0.1" value={crossSectionCulvert.bed} onChange={(event) => updateCross({ bed: Math.max(0, Number(event.currentTarget.value) || 0) })} /></Field>
            <Field label="Center X"><input type="number" step="0.1" placeholder="Thalweg" value={crossSectionCulvert.center ?? ''} onChange={(event) => updateCross({ center: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })} /></Field>
            {crossSectionCulvert.kind === 'box' || crossSectionCulvert.kind === 'ellipse' ? <>
              <Field label="Width (ft)"><input type="number" min="0.1" step="0.1" value={crossSectionCulvert.width} onChange={(event) => updateCross({ width: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field>
              <Field label="Height (ft)"><input type="number" min="0.1" step="0.1" value={crossSectionCulvert.height} onChange={(event) => updateCross({ height: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field>
            </> : null}
            {crossSectionCulvert.kind === 'arch' ? <>
              <Field label="Span (ft)"><input type="number" min="0.1" step="0.1" value={crossSectionCulvert.span} onChange={(event) => updateCross({ span: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field>
              <Field label="Leg height (ft)"><input type="number" min="0" step="0.1" value={crossSectionCulvert.legHeight} onChange={(event) => updateCross({ legHeight: Math.max(0, Number(event.currentTarget.value) || 0) })} /></Field>
              <Field label="Rise (ft)"><input type="number" min="0.1" step="0.1" value={crossSectionCulvert.rise} onChange={(event) => updateCross({ rise: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field>
            </> : null}
            {crossSectionCulvert.kind === 'circle' ? <Field label="Diameter (ft)"><input type="number" min="0.1" step="0.1" value={crossSectionCulvert.diameter} onChange={(event) => updateCross({ diameter: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field> : null}
            <Field label="Color"><input type="color" value={crossSectionCulvert.color} onChange={(event) => updateCross({ color: event.currentTarget.value })} /></Field>
            <Field label="Line width"><input type="number" min="0.5" max="8" step="0.25" value={crossSectionCulvert.lineWidth} onChange={(event) => updateCross({ lineWidth: Math.min(8, Math.max(0.5, Number(event.currentTarget.value) || 0.5)) })} /></Field>
          </div>
        </> : null}
      </div>
    )
  }

  const points = longitudinalScene?.lines.flatMap((line) => line.distances.map((distance, index) => ({ distance, elevation: line.elevations[index] }))).filter((point): point is { distance: number; elevation: number } => point.elevation != null && Number.isFinite(point.distance)) ?? []
  const add = () => {
    if (points.length === 0) return
    const culvert = createDefaultLongitudinalCulvert(
      longitudinalCulverts.length,
      Math.min(...points.map(({ distance }) => distance)),
      Math.max(...points.map(({ distance }) => distance)),
      Math.min(...points.map(({ elevation }) => elevation)),
      Math.max(...points.map(({ elevation }) => elevation)),
    )
    onLongitudinalCulvertsChange([...longitudinalCulverts, culvert])
    setSelectedId(culvert.id)
  }
  return (
    <div className="profile-settings-stack">
      <button className="button secondary full" type="button" disabled={points.length === 0} onClick={add}><Plus size={15} /> Add box culvert</button>
      {selected ? <>
        <Field label="Selected culvert"><select value={selectedId} onChange={(event) => setSelectedId(event.currentTarget.value)}>{longitudinalCulverts.map((culvert) => <option value={culvert.id} key={culvert.id}>{culvert.name}</option>)}</select></Field>
        <Field label="Legend name"><input value={selected.name} onChange={(event) => updateLongitudinal({ name: event.currentTarget.value })} /></Field>
        <div className="field-grid two">
          <Field label="Left station"><input type="number" step="0.1" value={selected.leftStation} onChange={(event) => updateLongitudinal({ leftStation: Math.min(Number(event.currentTarget.value), selected.rightStation - 0.01) })} /></Field>
          <Field label="Right station"><input type="number" step="0.1" value={selected.rightStation} onChange={(event) => updateLongitudinal({ rightStation: Math.max(Number(event.currentTarget.value), selected.leftStation + 0.01) })} /></Field>
          <Field label="Left invert"><input type="number" step="0.1" value={selected.invertLeft} onChange={(event) => updateLongitudinal({ invertLeft: Number(event.currentTarget.value) })} /></Field>
          <Field label="Right invert"><input type="number" step="0.1" value={selected.invertRight} onChange={(event) => updateLongitudinal({ invertRight: Number(event.currentTarget.value) })} /></Field>
          <Field label="Height"><input type="number" min="0.1" step="0.1" value={selected.height} onChange={(event) => updateLongitudinal({ height: Math.max(0.1, Number(event.currentTarget.value) || 0.1) })} /></Field>
          <Field label="Color"><input type="color" value={selected.color} onChange={(event) => updateLongitudinal({ color: event.currentTarget.value })} /></Field>
          <Field label="Line style"><select value={chartLinePattern({ color: selected.color, width: selected.lineWidth, dash: selected.dash })} onChange={(event) => updateLongitudinal({ dash: chartLineDash(event.currentTarget.value as 'solid' | 'dashed' | 'dotted' | 'dash-dot') })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="dash-dot">Dash-dot</option></select></Field>
          <Field label="Line width"><input type="number" min="0.5" max="8" step="0.25" value={selected.lineWidth} onChange={(event) => updateLongitudinal({ lineWidth: Math.min(8, Math.max(0.5, Number(event.currentTarget.value) || 0.5)) })} /></Field>
        </div>
        <button className="button danger full" type="button" onClick={() => onLongitudinalCulvertsChange(longitudinalCulverts.filter(({ id }) => id !== selected.id))}><Trash2 size={15} /> Remove selected culvert</button>
      </> : null}
    </div>
  )
}
