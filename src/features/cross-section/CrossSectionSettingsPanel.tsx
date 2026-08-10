import {
  ArrowLeftRight,
  Download,
  Eye,
  Map,
  MousePointer2,
  Trash2,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { Toggle } from '../../components/settings/Toggle'
import { ChartAxesControls } from '../chart-tools/ChartAxesControls'
import { ChartLayoutControls } from '../chart-tools/ChartLayoutControls'
import { ChartSeriesControls } from '../chart-tools/ChartSeriesControls'
import type {
  CrossSectionLine,
  WseAssessmentLine,
} from '../../core/types'
import type {
  CrossSectionFigureSettings,
} from './crossSectionSettings'
import type { CrossSectionSettingsSectionKey } from './crossSectionDefinition'
import {
  applyCrossSectionChartAxes,
  applyCrossSectionChartLayout,
  applyCrossSectionChartLegend,
  crossSectionChartAxes,
  crossSectionChartLayout,
  crossSectionChartLegend,
  crossSectionChartSeries,
  moveCrossSectionSeries,
  updateCrossSectionSeries,
} from './crossSectionChartStyle'

type Props = {
  section: CrossSectionSettingsSectionKey
  settings: CrossSectionFigureSettings
  assessmentLines: WseAssessmentLine[]
  selectedAssessmentLineId: string
  selectedLine: CrossSectionLine | null
  drawing: boolean
  canDownload: boolean
  exportActions: ReactNode
  onSettingsChange(
    update: (settings: CrossSectionFigureSettings) => CrossSectionFigureSettings,
  ): void
  onAssessmentLineChange(id: string): void
  onStartDrawing(): void
  onReverseLine(): void
  onFlipViewSide(): void
  onClearLine(): void
  onShowMap(): void
  onDownload(): void
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function CrossSectionSettingsPanel({
  section,
  settings,
  assessmentLines,
  selectedAssessmentLineId,
  selectedLine,
  drawing,
  canDownload,
  exportActions,
  onSettingsChange,
  onAssessmentLineChange,
  onStartDrawing,
  onReverseLine,
  onFlipViewSide,
  onClearLine,
  onShowMap,
  onDownload,
}: Props) {
  const update = <Key extends keyof CrossSectionFigureSettings>(
    key: Key,
    value: CrossSectionFigureSettings[Key],
  ) => onSettingsChange((current) => ({ ...current, [key]: value }))

  return (
    <ControlSection>
      {section === 'section' ? (
        <div className="cross-settings-stack">
          <button className="button secondary full" type="button" onClick={onShowMap}>
            <Map size={16} aria-hidden="true" />
            Show selection map
          </button>
          <Field label="Existing WSE assessment line">
            <select
              value={selectedAssessmentLineId}
              onChange={(event) =>
                onAssessmentLineChange(event.currentTarget.value)
              }
            >
              <option value="">Choose a generated line</option>
              {assessmentLines.map((line) => (
                <option value={line.id} key={line.id}>
                  {line.level.toFixed(2)} ft · {line.lengthFeet.toFixed(0)} ft long
                </option>
              ))}
            </select>
          </Field>
          <button
            className={`button secondary full${drawing ? ' active' : ''}`}
            type="button"
            onClick={onStartDrawing}
          >
            {drawing ? (
              <X size={16} aria-hidden="true" />
            ) : (
              <MousePointer2 size={16} aria-hidden="true" />
            )}
            {drawing ? 'Cancel drawing' : 'Draw manual section'}
          </button>
          {selectedLine ? (
            <div
              className="selected-section-card"
              data-testid="selected-section-card"
            >
              <div className="selected-section-summary">
                <div>
                  <strong>{selectedLine.label}</strong>
                  <span>
                    {selectedLine.source === 'assessment'
                      ? 'Assessment line'
                      : 'Manual section'}
                    {selectedLine.lengthFeet != null
                      ? ` · ${selectedLine.lengthFeet.toFixed(0)} ft`
                      : ''}
                  </span>
                </div>
                <button
                  className="icon-button danger"
                  type="button"
                  aria-label="Remove selected section"
                  title="Remove selected section"
                  onClick={onClearLine}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="selected-section-actions">
                <button
                  className="button secondary compact"
                  type="button"
                  onClick={onReverseLine}
                >
                  <ArrowLeftRight size={15} aria-hidden="true" />
                  Reverse A/B
                </button>
                <button
                  className="button secondary compact"
                  type="button"
                  onClick={onFlipViewSide}
                >
                  <Eye size={15} aria-hidden="true" />
                  Flip look arrow
                </button>
              </div>
            </div>
          ) : null}
          <Field label="Section name">
            <input
              value={settings.sectionName}
              onChange={(event) => update('sectionName', event.currentTarget.value)}
            />
          </Field>
          <div className="field-grid two">
            <Field label="Looking">
              <select
                value={settings.lookingDirection}
                onChange={(event) =>
                  update(
                    'lookingDirection',
                    event.currentTarget.value as 'downstream' | 'upstream',
                  )
                }
              >
                <option value="downstream">Downstream</option>
                <option value="upstream">Upstream</option>
              </select>
            </Field>
            <Field label="View arrow side">
              <span className="field-readout">
                {settings.downstreamSide === 'right' ? 'Right of A→B' : 'Left of A→B'}
              </span>
            </Field>
          </div>
          <div className="field-grid two">
            <Field label="Dry depth (ft)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.dryDepth}
                onChange={(event) =>
                  update('dryDepth', Math.max(0, Number(event.currentTarget.value) || 0))
                }
              />
            </Field>
            <Field label="Sample spacing (ft)">
              <input
                type="number"
                min="0.25"
                max="20"
                step="0.25"
                value={settings.sampleSpacing}
                onChange={(event) =>
                  update(
                    'sampleSpacing',
                    Math.max(0.25, Number(event.currentTarget.value) || 1),
                  )
                }
              />
            </Field>
          </div>
        </div>
      ) : null}

      {section === 'display' ? (
        <div className="cross-settings-stack">
          <ChartLayoutControls
            layout={crossSectionChartLayout(settings)}
            legend={crossSectionChartLegend(settings)}
            onLayoutChange={(value) => onSettingsChange((current) =>
              applyCrossSectionChartLayout(current, value))}
            onLegendChange={(value) => onSettingsChange((current) =>
              applyCrossSectionChartLegend(current, value))}
          />
          <ChartAxesControls
            axes={crossSectionChartAxes(settings)}
            onChange={(value) => onSettingsChange((current) =>
              applyCrossSectionChartAxes(current, value))}
          />
          <Toggle
            label="Discharge-weighted averages"
            checked={settings.showAverageWse}
            onChange={(value) => update('showAverageWse', value)}
          />
          <Toggle
            label="WSE rise/drop arrow"
            checked={settings.showDifferenceArrow}
            onChange={(value) => update('showDifferenceArrow', value)}
          />
        </div>
      ) : null}

      {section === 'styles' ? (
        <div className="cross-settings-stack">
          <ChartSeriesControls
            series={crossSectionChartSeries(settings)}
            onLabelChange={(id, label) => onSettingsChange((current) =>
              updateCrossSectionSeries(current, id, { label }))}
            onStyleChange={(id, style) => onSettingsChange((current) =>
              updateCrossSectionSeries(current, id, { style }))}
            onVisibilityChange={(id, visible) => onSettingsChange((current) =>
              updateCrossSectionSeries(current, id, { visible }))}
            onMove={(id, direction) => onSettingsChange((current) =>
              moveCrossSectionSeries(current, id, direction))}
          />
          <div className="field-grid two">
            <Field label="Arrow color">
              <input
                type="color"
                value={settings.arrowColor}
                onChange={(event) => update('arrowColor', event.currentTarget.value)}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {section === 'export' ? (
        <div className="cross-settings-stack">
          {exportActions}
          <button
            className="button secondary full"
            type="button"
            disabled={!canDownload}
            onClick={onDownload}
          >
            <Download size={17} aria-hidden="true" />
            Download cross-section PNG
          </button>
        </div>
      ) : null}
    </ControlSection>
  )
}
