import {
  ArrowLeftRight,
  Download,
  Eye,
  LineChart,
  Map,
  MousePointer2,
  Trash2,
  X,
} from 'lucide-react'
import { ControlSection } from '../../components/ControlSection'
import type {
  CrossSectionLine,
  WseAssessmentLine,
} from '../../core/types'
import { Toggle } from '../wse-difference/components/Toggle'
import type {
  CrossSectionFigureSettings,
  CrossSectionLineStyle,
} from './crossSectionSettings'
import type { CrossSectionSettingsSectionKey } from './crossSectionDefinition'

type Props = {
  section: CrossSectionSettingsSectionKey
  settings: CrossSectionFigureSettings
  assessmentLines: WseAssessmentLine[]
  selectedAssessmentLineId: string
  selectedLine: CrossSectionLine | null
  drawing: boolean
  canGenerate: boolean
  canDownload: boolean
  onSettingsChange(
    update: (settings: CrossSectionFigureSettings) => CrossSectionFigureSettings,
  ): void
  onAssessmentLineChange(id: string): void
  onStartDrawing(): void
  onReverseLine(): void
  onFlipViewSide(): void
  onClearLine(): void
  onShowMap(): void
  onGenerate(): void
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

function LineStyleEditor({
  label,
  style,
  onChange,
}: {
  label: string
  style: CrossSectionLineStyle
  onChange(style: CrossSectionLineStyle): void
}) {
  return (
    <div className="cross-line-style">
      <strong>{label}</strong>
      <div className="field-grid two">
        <Field label="Color">
          <input
            type="color"
            value={style.color}
            onChange={(event) =>
              onChange({ ...style, color: event.currentTarget.value })
            }
          />
        </Field>
        <Field label="Width">
          <input
            type="number"
            min="0.5"
            max="8"
            step="0.25"
            value={style.width}
            onChange={(event) =>
              onChange({
                ...style,
                width: Math.max(0.5, Number(event.currentTarget.value) || 0.5),
              })
            }
          />
        </Field>
      </div>
    </div>
  )
}

export function CrossSectionSettingsPanel({
  section,
  settings,
  assessmentLines,
  selectedAssessmentLineId,
  selectedLine,
  drawing,
  canGenerate,
  canDownload,
  onSettingsChange,
  onAssessmentLineChange,
  onStartDrawing,
  onReverseLine,
  onFlipViewSide,
  onClearLine,
  onShowMap,
  onGenerate,
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
          <button
            className="button primary full"
            type="button"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            <LineChart size={17} aria-hidden="true" />
            Generate cross section
          </button>
        </div>
      ) : null}

      {section === 'display' ? (
        <div className="cross-settings-stack">
          <Field label="Figure title">
            <textarea
              rows={2}
              value={settings.title}
              onChange={(event) => update('title', event.currentTarget.value)}
            />
          </Field>
          <div className="segmented">
            {(['landscape', 'portrait'] as const).map((orientation) => (
              <button
                className={settings.orientation === orientation ? 'active' : ''}
                type="button"
                key={orientation}
                onClick={() => update('orientation', orientation)}
              >
                {orientation[0].toUpperCase() + orientation.slice(1)}
              </button>
            ))}
          </div>
          <Toggle
            label="Existing ground"
            checked={settings.showExistingGround}
            onChange={(value) => update('showExistingGround', value)}
          />
          <Toggle
            label="Proposed ground"
            checked={settings.showProposedGround}
            onChange={(value) => update('showProposedGround', value)}
          />
          <Toggle
            label="Existing WSE"
            checked={settings.showExistingWse}
            onChange={(value) => update('showExistingWse', value)}
          />
          <Toggle
            label="Proposed WSE"
            checked={settings.showProposedWse}
            onChange={(value) => update('showProposedWse', value)}
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
          <Toggle
            label="Legend"
            checked={settings.showLegend}
            onChange={(value) => update('showLegend', value)}
          />
          <Toggle
            label="Grid"
            checked={settings.showGrid}
            onChange={(value) => update('showGrid', value)}
          />
        </div>
      ) : null}

      {section === 'styles' ? (
        <div className="cross-settings-stack">
          <LineStyleEditor
            label="Existing ground"
            style={settings.existingGroundStyle}
            onChange={(style) => update('existingGroundStyle', style)}
          />
          <LineStyleEditor
            label="Proposed ground"
            style={settings.proposedGroundStyle}
            onChange={(style) => update('proposedGroundStyle', style)}
          />
          <LineStyleEditor
            label="Existing WSE"
            style={settings.existingWseStyle}
            onChange={(style) => update('existingWseStyle', style)}
          />
          <LineStyleEditor
            label="Proposed WSE"
            style={settings.proposedWseStyle}
            onChange={(style) => update('proposedWseStyle', style)}
          />
          <div className="field-grid two">
            <Field label="Arrow color">
              <input
                type="color"
                value={settings.arrowColor}
                onChange={(event) => update('arrowColor', event.currentTarget.value)}
              />
            </Field>
            <Field label="Text size">
              <input
                type="number"
                min="12"
                max="30"
                value={settings.fontSize}
                onChange={(event) =>
                  update('fontSize', Math.max(12, Number(event.currentTarget.value) || 18))
                }
              />
            </Field>
          </div>
        </div>
      ) : null}

      {section === 'export' ? (
        <div className="cross-settings-stack">
          <button
            className="button primary full"
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
