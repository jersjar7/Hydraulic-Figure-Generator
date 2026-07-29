import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RefreshCcw,
} from 'lucide-react'
import { ControlSection } from '../../../components/ControlSection'
import type { FigureSettings } from '../../../core/types'
import type { FigureSettingsChange } from '../settingsPanelTypes'
import { NudgeButton } from './NudgeButton'

type FrameSettingsPanelProps = {
  settings: FigureSettings
  onSettingsChange: FigureSettingsChange
  onResetView: () => void
}

const numeric = (value: string, fallback = 0) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function FrameSettingsPanel({
  settings,
  onSettingsChange,
  onResetView,
}: FrameSettingsPanelProps) {
  return (
    <ControlSection>
      <div className="segmented" aria-label="Figure orientation">
        <button
          type="button"
          className={settings.orientation === 'landscape' ? 'active' : ''}
          onClick={() => onSettingsChange('orientation', 'landscape')}
        >
          Landscape
        </button>
        <button
          type="button"
          className={settings.orientation === 'portrait' ? 'active' : ''}
          onClick={() => onSettingsChange('orientation', 'portrait')}
        >
          Portrait
        </button>
      </div>
      <label className="range-field">
        <span>
          Rotation <output>{settings.rotation.toFixed(0)}°</output>
        </span>
        <input
          type="range"
          min="-180"
          max="180"
          step="1"
          value={settings.rotation}
          onChange={(event) =>
            onSettingsChange('rotation', numeric(event.target.value))
          }
        />
      </label>
      <label className="range-field">
        <span>
          Zoom <output>{settings.zoom.toFixed(2)}×</output>
        </span>
        <input
          type="range"
          min="0.35"
          max="4"
          step="0.05"
          value={settings.zoom}
          onChange={(event) =>
            onSettingsChange('zoom', numeric(event.target.value, 1))
          }
        />
      </label>
      <label className="range-field">
        <span>
          Aerial opacity{' '}
          <output>{Math.round(settings.basemapOpacity * 100)}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.basemapOpacity}
          onChange={(event) =>
            onSettingsChange(
              'basemapOpacity',
              numeric(event.target.value, 0.72),
            )
          }
        />
      </label>
      <div className="nudge-control map-pan">
        <span>Pan map</span>
        <div className="nudge-buttons">
          <NudgeButton
            label="Pan left"
            icon={<ArrowLeft size={15} />}
            onClick={() =>
              onSettingsChange('panX', settings.panX - 30)
            }
          />
          <NudgeButton
            label="Pan up"
            icon={<ArrowUp size={15} />}
            onClick={() =>
              onSettingsChange('panY', settings.panY - 30)
            }
          />
          <NudgeButton
            label="Pan down"
            icon={<ArrowDown size={15} />}
            onClick={() =>
              onSettingsChange('panY', settings.panY + 30)
            }
          />
          <NudgeButton
            label="Pan right"
            icon={<ArrowRight size={15} />}
            onClick={() =>
              onSettingsChange('panX', settings.panX + 30)
            }
          />
          <NudgeButton
            label="Reset view"
            icon={<RefreshCcw size={15} />}
            onClick={onResetView}
          />
        </div>
      </div>
    </ControlSection>
  )
}
