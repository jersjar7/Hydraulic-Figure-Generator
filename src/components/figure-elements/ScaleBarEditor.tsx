import { SectionHeading } from './elementControls'
import type { ElementEditorProps } from './editorTypes'
import { numberValue } from './numberValue'

export function ScaleBarEditor({
  settings,
  onStyleChange,
}: ElementEditorProps) {
  const style = settings.elementStyles.scale
  return (
    <>
      <SectionHeading>Scale</SectionHeading>
      <div className="field-grid two">
        <label className="field">
          <span>Length</span>
          <select
            value={style.lengthMode}
            onChange={(event) =>
              onStyleChange('scale', {
                lengthMode: event.target.value as 'auto' | 'manual',
              })
            }
          >
            <option value="auto">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="field">
          <span>Units</span>
          <select
            value={style.units}
            onChange={(event) =>
              onStyleChange('scale', {
                units: event.target.value as
                  | 'us-survey-ft'
                  | 'ft'
                  | 'mi'
                  | 'm',
              })
            }
          >
            <option value="us-survey-ft">U.S. survey feet</option>
            <option value="ft">Feet</option>
            <option value="mi">Miles</option>
            <option value="m">Meters</option>
          </select>
        </label>
      </div>
      {style.lengthMode === 'manual' ? (
        <label className="field">
          <span>Map length</span>
          <input
            type="number"
            min="0.01"
            step="1"
            value={style.manualLength}
            onChange={(event) =>
              onStyleChange('scale', {
                manualLength: numberValue(event.target.value, 100),
              })
            }
          />
        </label>
      ) : null}
      <div className="field-grid two">
        <label className="field">
          <span>Divisions</span>
          <input
            type="number"
            min="2"
            max="6"
            value={style.divisions}
            onChange={(event) =>
              onStyleChange('scale', {
                divisions: numberValue(event.target.value, 4),
              })
            }
          />
        </label>
        <label className="field">
          <span>Style</span>
          <select
            value={style.style}
            onChange={(event) =>
              onStyleChange('scale', {
                style: event.target.value as 'alternating' | 'ticks',
              })
            }
          >
            <option value="alternating">Alternating bar</option>
            <option value="ticks">Tick line</option>
          </select>
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>Decimals</span>
          <input
            type="number"
            min="0"
            max="3"
            value={style.decimalPlaces}
            onChange={(event) =>
              onStyleChange('scale', {
                decimalPlaces: numberValue(event.target.value, 0),
              })
            }
          />
        </label>
        <label className="field">
          <span>
            Font size <small>px</small>
          </span>
          <input
            type="number"
            min="10"
            max="32"
            value={style.fontSize}
            onChange={(event) =>
              onStyleChange('scale', {
                fontSize: numberValue(event.target.value, 17),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Line</span>
          <input
            type="color"
            value={style.lineColor}
            onChange={(event) =>
              onStyleChange('scale', { lineColor: event.target.value })
            }
          />
        </label>
        <label className="field color-field">
          <span>Fill</span>
          <input
            type="color"
            value={style.fillColor}
            onChange={(event) =>
              onStyleChange('scale', { fillColor: event.target.value })
            }
          />
        </label>
      </div>
      <label className="field color-field">
        <span>Text</span>
        <input
          type="color"
          value={style.textColor}
          onChange={(event) =>
            onStyleChange('scale', { textColor: event.target.value })
          }
        />
      </label>
    </>
  )
}
