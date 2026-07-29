import { SectionHeading } from './elementControls'
import type { ElementEditorProps } from './editorTypes'
import { numberValue } from './numberValue'

export function WetDryKeyEditor({
  settings,
  onStyleChange,
}: ElementEditorProps) {
  const style = settings.elementStyles.wetDry
  return (
    <>
      <SectionHeading>Content</SectionHeading>
      <label className="field">
        <span>Title</span>
        <input
          type="text"
          value={style.title}
          onChange={(event) =>
            onStyleChange('wetDry', { title: event.target.value })
          }
        />
      </label>
      <div className="field-grid two">
        <label className="field">
          <span>Wet label</span>
          <input
            type="text"
            value={style.wetLabel}
            onChange={(event) =>
              onStyleChange('wetDry', { wetLabel: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Dry label</span>
          <input
            type="text"
            value={style.dryLabel}
            onChange={(event) =>
              onStyleChange('wetDry', { dryLabel: event.target.value })
            }
          />
        </label>
      </div>
      <SectionHeading>Layout</SectionHeading>
      <div className="field-grid two">
        <label className="field">
          <span>Direction</span>
          <select
            value={style.orientation}
            onChange={(event) =>
              onStyleChange('wetDry', {
                orientation: event.target.value as 'vertical' | 'horizontal',
              })
            }
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
        <label className="field">
          <span>
            Font size <small>px</small>
          </span>
          <input
            type="number"
            min="10"
            max="34"
            value={style.fontSize}
            onChange={(event) =>
              onStyleChange('wetDry', {
                fontSize: numberValue(event.target.value, 18),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field">
          <span>
            Swatch size <small>px</small>
          </span>
          <input
            type="number"
            min="12"
            max="46"
            value={style.swatchSize}
            onChange={(event) =>
              onStyleChange('wetDry', {
                swatchSize: numberValue(event.target.value, 24),
              })
            }
          />
        </label>
        <label className="field color-field">
          <span>Text</span>
          <input
            type="color"
            value={style.textColor}
            onChange={(event) =>
              onStyleChange('wetDry', { textColor: event.target.value })
            }
          />
        </label>
      </div>
    </>
  )
}
