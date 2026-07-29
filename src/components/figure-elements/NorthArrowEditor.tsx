import { SectionHeading, Toggle } from './elementControls'
import type { ElementEditorProps } from './editorTypes'
import { numberValue } from './numberValue'

export function NorthArrowEditor({
  settings,
  onStyleChange,
}: ElementEditorProps) {
  const style = settings.elementStyles.north
  return (
    <>
      <SectionHeading>Symbol</SectionHeading>
      <div className="field-grid two">
        <label className="field">
          <span>Style</span>
          <select
            value={style.style}
            onChange={(event) =>
              onStyleChange('north', {
                style: event.target.value as 'classic' | 'simple' | 'compass',
              })
            }
          >
            <option value="classic">Classic</option>
            <option value="simple">Simple</option>
            <option value="compass">Compass</option>
          </select>
        </label>
        <label className="field">
          <span>
            Size <small>px</small>
          </span>
          <input
            type="number"
            min="48"
            max="150"
            value={style.size}
            onChange={(event) =>
              onStyleChange('north', {
                size: numberValue(event.target.value, 88),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Symbol</span>
          <input
            type="color"
            value={style.color}
            onChange={(event) =>
              onStyleChange('north', { color: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Orientation</span>
          <select
            value={style.rotationMode}
            onChange={(event) =>
              onStyleChange('north', {
                rotationMode: event.target.value as 'true-north' | 'page-up',
              })
            }
          >
            <option value="true-north">True north</option>
            <option value="page-up">Page up</option>
          </select>
        </label>
      </div>
      <Toggle
        label="Show N label"
        checked={style.showLabel}
        onChange={(showLabel) => onStyleChange('north', { showLabel })}
      />
    </>
  )
}
