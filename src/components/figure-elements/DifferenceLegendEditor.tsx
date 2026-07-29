import { SectionHeading } from './elementControls'
import type { ElementEditorProps } from './editorTypes'
import { numberValue } from './numberValue'

export function DifferenceLegendEditor({
  settings,
  onStyleChange,
}: ElementEditorProps) {
  const style = settings.elementStyles.diffLegend
  return (
    <>
      <SectionHeading>Content</SectionHeading>
      <div className="field-grid two">
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            value={style.title}
            onChange={(event) =>
              onStyleChange('diffLegend', { title: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Units</span>
          <input
            type="text"
            value={style.units}
            onChange={(event) =>
              onStyleChange('diffLegend', { units: event.target.value })
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
              onStyleChange('diffLegend', {
                orientation: event.target.value as 'vertical' | 'horizontal',
              })
            }
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </label>
        <label className="field">
          <span>Decimals</span>
          <input
            type="number"
            min="0"
            max="3"
            value={style.decimalPlaces}
            onChange={(event) =>
              onStyleChange('diffLegend', {
                decimalPlaces: numberValue(event.target.value, 1),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
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
              onStyleChange('diffLegend', {
                fontSize: numberValue(event.target.value, 19),
              })
            }
          />
        </label>
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
              onStyleChange('diffLegend', {
                swatchSize: numberValue(event.target.value, 25),
              })
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
            onStyleChange('diffLegend', { textColor: event.target.value })
          }
        />
      </label>
    </>
  )
}
