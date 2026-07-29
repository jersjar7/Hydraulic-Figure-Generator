import { SectionHeading } from './elementControls'
import type { ElementEditorProps } from './editorTypes'
import { numberValue } from './numberValue'

type Props = ElementEditorProps & {
  onTitleTemplateChange(value: string): void
}

export function TitleElementEditor({
  settings,
  onStyleChange,
  onTitleTemplateChange,
}: Props) {
  const style = settings.elementStyles.title
  return (
    <>
      <SectionHeading>Content</SectionHeading>
      <label className="field">
        <span>Figure title</span>
        <input
          type="text"
          value={settings.titleTemplate}
          onChange={(event) => onTitleTemplateChange(event.target.value)}
        />
      </label>
      <div className="template-tokens" aria-label="Available title fields">
        <code>{'{type}'}</code>
        <code>{'{baseline}'}</code>
        <code>{'{baselineRun}'}</code>
        <code>{'{comparison}'}</code>
        <code>{'{comparisonRun}'}</code>
        <code>{'{existing}'}</code>
        <code>{'{proposed}'}</code>
      </div>
      <SectionHeading>Typography</SectionHeading>
      <div className="field-grid two">
        <label className="field">
          <span>
            Font size <small>px</small>
          </span>
          <input
            type="number"
            min="12"
            max="64"
            value={style.fontSize}
            onChange={(event) =>
              onStyleChange('title', {
                fontSize: numberValue(event.target.value, 26),
              })
            }
          />
        </label>
        <label className="field">
          <span>Weight</span>
          <select
            value={style.fontWeight}
            onChange={(event) =>
              onStyleChange('title', {
                fontWeight: Number(event.target.value) as 400 | 600 | 700,
              })
            }
          >
            <option value="400">Regular</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </select>
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Text</span>
          <input
            type="color"
            value={style.textColor}
            onChange={(event) =>
              onStyleChange('title', { textColor: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Alignment</span>
          <select
            value={style.alignment}
            onChange={(event) =>
              onStyleChange('title', {
                alignment: event.target.value as 'left' | 'center' | 'right',
              })
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>
          Maximum width <small>px</small>
        </span>
        <input
          type="number"
          min="240"
          max="1500"
          step="20"
          value={style.maxWidth}
          onChange={(event) =>
            onStyleChange('title', {
              maxWidth: numberValue(event.target.value, 1100),
            })
          }
        />
      </label>
    </>
  )
}
