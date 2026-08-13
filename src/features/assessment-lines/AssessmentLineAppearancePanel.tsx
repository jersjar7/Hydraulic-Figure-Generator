import { SettingsGroup } from '../../components/settings/SettingsGroup'
import { Toggle } from '../../components/settings/Toggle'
import type { FigureSettings } from '../../core/types'
import type { FigureSettingsChange } from '../wse-difference/settingsPanelTypes'

type Props = {
  settings: FigureSettings
  onSettingsChange: FigureSettingsChange
}

const numeric = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function AssessmentLineAppearancePanel({
  settings,
  onSettingsChange,
}: Props) {
  return (
    <SettingsGroup title="Appearance">
      <Toggle
        label="Show WSE lines"
        checked={settings.showAssessmentLines}
        onChange={(checked) => onSettingsChange('showAssessmentLines', checked)}
      />
      <div className="field-grid two">
        <label className="field color-field">
          <span>Line color</span>
          <input
            type="color"
            value={settings.assessmentLineColor}
            onChange={(event) =>
              onSettingsChange('assessmentLineColor', event.target.value)
            }
          />
        </label>
        <label className="field">
          <span>Line width <small>px</small></span>
          <input
            type="number"
            min="0.25"
            max="12"
            step="0.25"
            value={settings.assessmentLineWidth}
            onChange={(event) =>
              onSettingsChange(
                'assessmentLineWidth',
                numeric(event.target.value, 2),
              )
            }
          />
        </label>
      </div>
      <Toggle
        label="Show WSE callouts"
        checked={settings.showAssessmentLabels}
        onChange={(checked) => onSettingsChange('showAssessmentLabels', checked)}
      />
      <div className="field-grid two">
        <label className="field color-field">
          <span>Label color</span>
          <input
            type="color"
            value={settings.assessmentLabelColor}
            onChange={(event) =>
              onSettingsChange('assessmentLabelColor', event.target.value)
            }
          />
        </label>
        <label className="field">
          <span>Label size <small>px</small></span>
          <input
            type="number"
            min="6"
            max="72"
            step="1"
            value={settings.assessmentLabelFontSize}
            onChange={(event) =>
              onSettingsChange(
                'assessmentLabelFontSize',
                numeric(event.target.value, 18),
              )
            }
          />
        </label>
        <label className="field">
          <span>Label offset <small>px</small></span>
          <input
            type="number"
            min="0"
            max="120"
            step="1"
            value={settings.assessmentLabelOffset}
            onChange={(event) =>
              onSettingsChange(
                'assessmentLabelOffset',
                numeric(event.target.value, 28),
              )
            }
          />
        </label>
        <label className="field">
          <span>Label side</span>
          <select
            value={settings.assessmentLabelSide}
            onChange={(event) =>
              onSettingsChange(
                'assessmentLabelSide',
                event.target.value as FigureSettings['assessmentLabelSide'],
              )
            }
          >
            <option value="alternate">Alternate</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
    </SettingsGroup>
  )
}
