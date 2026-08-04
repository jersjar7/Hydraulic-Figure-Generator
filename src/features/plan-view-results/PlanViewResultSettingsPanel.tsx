import { Download, FileJson } from 'lucide-react'
import type { ComponentProps } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
import {
  SCALAR_RAMP_OPTIONS,
  scalarRampGradient,
} from '../../core/map/scalarResultRamp'
import type {
  FigureElementPanelKey,
  PlanViewResultSettings,
  PlanViewOutputOption,
  ScalarRampKey,
} from '../../core/types'
import type { useMapElementController } from '../figures/useMapElementController'
import { CenterlineStationingToolPanel } from '../stationing/CenterlineStationingToolPanel'
import { FrameSettingsPanel } from '../wse-difference/components/FrameSettingsPanel'
import { Toggle } from '../wse-difference/components/Toggle'
import type { FigureSettingsChange } from '../wse-difference/settingsPanelTypes'
import type { PlanViewResultSettingsSectionKey } from './planViewResultDefinition'

type Props = {
  section: PlanViewResultSettingsSectionKey
  settings: PlanViewResultSettings
  resultOptions: PlanViewOutputOption[]
  activeElement: FigureElementPanelKey
  elements: ReturnType<typeof useMapElementController<PlanViewResultSettings>>
  stationing: ComponentProps<typeof CenterlineStationingToolPanel>
  canDownload: boolean
  onSettingsChange<Key extends keyof PlanViewResultSettings>(
    key: Key,
    value: PlanViewResultSettings[Key],
  ): void
  onResultParameterChange(paramName: string): void
  onActiveElementChange(element: FigureElementPanelKey): void
  onDownload(): void
}

function optionalNumber(value: string) {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function LegendControls({
  settings,
  resultOptions,
  onSettingsChange,
}: Pick<Props, 'settings' | 'resultOptions' | 'onSettingsChange'>) {
  const output = resultOptions.find(
    (option) => option.paramName === settings.resultParameter,
  )
  const showsSurface = output?.kind !== 'mesh-elements'
  const showsMesh =
    output?.kind === 'mesh-elements' ||
    output?.kind === 'topography-mesh-elements'
  return (
    <ControlSection>
      {showsSurface ? (
        <>
          <label className="field">
            <span>Color ramp</span>
            <select
              value={settings.ramp}
              onChange={(event) =>
                onSettingsChange('ramp', event.currentTarget.value as ScalarRampKey)
              }
            >
              {SCALAR_RAMP_OPTIONS.map((option) => (
                <option value={option.key} key={option.key}>{option.label}</option>
              ))}
            </select>
            <span
              className="ramp-preview"
              style={{ background: scalarRampGradient(settings.ramp) }}
              aria-hidden="true"
            />
          </label>
          <div className="field-grid two">
            <label className="field">
              <span>Minimum</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.legendMin ?? ''}
                onChange={(event) =>
                  onSettingsChange('legendMin', optionalNumber(event.currentTarget.value))
                }
              />
            </label>
            <label className="field">
              <span>Maximum</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.legendMax ?? ''}
                onChange={(event) =>
                  onSettingsChange('legendMax', optionalNumber(event.currentTarget.value))
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Class interval</span>
            <input
              type="number"
              min="0.0001"
              step="any"
              placeholder="Auto"
              value={settings.scalarLegendInterval ?? ''}
              onChange={(event) =>
                onSettingsChange(
                  'scalarLegendInterval',
                  optionalNumber(event.currentTarget.value),
                )
              }
            />
          </label>
          <Toggle
            label="Contour lines"
            checked={settings.showContours}
            onChange={(checked) => onSettingsChange('showContours', checked)}
          />
        </>
      ) : null}
      {showsSurface && settings.showContours ? (
        <div className="field-grid two">
          <label className="field">
            <span>Contour interval</span>
            <input
              type="number"
              min="0.0001"
              step="any"
              placeholder="Class interval"
              value={settings.contourInterval ?? ''}
              onChange={(event) =>
                onSettingsChange(
                  'contourInterval',
                  optionalNumber(event.currentTarget.value),
                )
              }
            />
          </label>
          <label className="field color-field">
            <span>Contour color</span>
            <input
              type="color"
              value={settings.contourColor}
              onChange={(event) =>
                onSettingsChange('contourColor', event.currentTarget.value)
              }
            />
          </label>
          <label className="field">
            <span>Contour width <small>px</small></span>
            <input
              type="number"
              min="0.25"
              max="8"
              step="0.25"
              value={settings.contourWidth}
              onChange={(event) =>
                onSettingsChange(
                  'contourWidth',
                  Math.max(0.25, Number(event.currentTarget.value) || 1),
                )
              }
            />
          </label>
        </div>
      ) : null}
      {showsMesh ? (
        <div className="field-grid two">
          <label className="field color-field">
            <span>Mesh line color</span>
            <input
              type="color"
              value={settings.meshLineColor}
              onChange={(event) =>
                onSettingsChange('meshLineColor', event.currentTarget.value)
              }
            />
          </label>
          <label className="field">
            <span>Line width <small>px</small></span>
            <input
              type="number"
              min="0.25"
              max="8"
              step="0.25"
              value={settings.meshLineWidth}
              onChange={(event) =>
                onSettingsChange(
                  'meshLineWidth',
                  Math.max(0.25, Number(event.currentTarget.value) || 0.75),
                )
              }
            />
          </label>
          <label className="field">
            <span>Line opacity</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.meshLineOpacity}
              onChange={(event) =>
                onSettingsChange('meshLineOpacity', Number(event.currentTarget.value))
              }
            />
          </label>
        </div>
      ) : null}
    </ControlSection>
  )
}

export function PlanViewResultSettingsPanel(props: Props) {
  const {
    section,
    settings,
    resultOptions,
    activeElement,
    elements,
    stationing,
    canDownload,
    onSettingsChange,
    onResultParameterChange,
    onActiveElementChange,
    onDownload,
  } = props
  const selectedOutput = resultOptions.find(
    (option) => option.paramName === settings.resultParameter,
  )
  if (section === 'result') {
    return (
      <ControlSection>
        <label className="field">
          <span>Map content</span>
          <select
            value={settings.resultParameter}
            disabled={resultOptions.length === 0}
            onChange={(event) =>
              onResultParameterChange(event.currentTarget.value)
            }
          >
            {resultOptions.length === 0 ? (
              <option value="">Add scenario geometry</option>
            ) : (
              <>
                <optgroup label="Geometry">
                  {resultOptions.filter((option) => !option.runDependent).map((option) => (
                    <option value={option.paramName} key={option.paramName}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hydraulic results">
                  {resultOptions.filter((option) => option.runDependent).map((option) => (
                    <option value={option.paramName} key={option.paramName}>
                      {option.label}{option.units ? ` (${option.units})` : ''}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
        </label>
        <Toggle
          label="Shapefile overlays"
          checked={settings.showOverlays}
          onChange={(checked) => onSettingsChange('showOverlays', checked)}
        />
      </ControlSection>
    )
  }
  if (section === 'legend') {
    return <LegendControls {...props} />
  }
  if (section === 'frame') {
    return (
      <FrameSettingsPanel
        settings={settings}
        onSettingsChange={onSettingsChange as FigureSettingsChange}
        onResetView={elements.resetView}
      />
    )
  }
  if (section === 'elements') {
    return (
      <ControlSection>
        <FigureElementsPanel
          settings={settings}
          availableElements={selectedOutput?.kind === 'mesh-elements'
            ? ['title', 'north', 'scale']
            : ['title', 'diffLegend', 'north', 'scale']}
          activeElement={activeElement}
          onActiveElementChange={onActiveElementChange}
          onVisibilityChange={elements.updateElementVisibility}
          onTitleTemplateChange={(value) =>
            onSettingsChange('titleTemplate', value)
          }
          onStyleChange={elements.updateElementStyle}
          onPositionChange={elements.updateElementPosition}
          onNudge={elements.nudgeElement}
          onResetElement={elements.resetElement}
        />
      </ControlSection>
    )
  }
  if (section === 'stationing') {
    return <CenterlineStationingToolPanel {...stationing} />
  }
  return (
    <ControlSection>
      <div className="export-note">
        <FileJson size={17} aria-hidden="true" />
        <span>
          Project files retain map settings and overlays. H5 files remain local
          and must be re-added.
        </span>
      </div>
      <button
        className="button secondary full"
        type="button"
        disabled={!canDownload}
        onClick={onDownload}
      >
        <Download size={17} aria-hidden="true" />
        Download map PNG
      </button>
    </ControlSection>
  )
}
