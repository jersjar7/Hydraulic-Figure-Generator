import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Compass,
  Droplets,
  Eye,
  EyeOff,
  RotateCcw,
  Ruler,
  Type,
} from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import type {
  Anchor,
  ElementBoxStyle,
  ElementPosition,
  FigureSettings,
  MapElementKey,
  MapElementStyles,
} from '../core/types'

const ELEMENTS = [
  { key: 'title', label: 'Title', icon: Type },
  { key: 'diffLegend', label: 'Difference legend', icon: BarChart3 },
  { key: 'wetDry', label: 'Wet/dry key', icon: Droplets },
  { key: 'north', label: 'North arrow', icon: Compass },
  { key: 'scale', label: 'Scale bar', icon: Ruler },
] as const

const ANCHORS: { value: Anchor; label: string }[] = [
  { value: 'tl', label: 'Top left' },
  { value: 'tc', label: 'Top center' },
  { value: 'tr', label: 'Top right' },
  { value: 'ml', label: 'Middle left' },
  { value: 'mc', label: 'Center' },
  { value: 'mr', label: 'Middle right' },
  { value: 'bl', label: 'Bottom left' },
  { value: 'bc', label: 'Bottom center' },
  { value: 'br', label: 'Bottom right' },
]

type Props = {
  settings: FigureSettings
  activeElement: MapElementKey
  onActiveElementChange(key: MapElementKey): void
  onVisibilityChange(key: MapElementKey, visible: boolean): void
  onTitleTemplateChange(value: string): void
  onStyleChange(
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ): void
  onPositionChange(key: MapElementKey, patch: Partial<ElementPosition>): void
  onNudge(key: MapElementKey, dx: number, dy: number): void
  onResetElement(key: MapElementKey): void
}

function numberValue(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function visibleFor(settings: FigureSettings, key: MapElementKey) {
  if (key === 'title') return settings.showTitle
  if (key === 'diffLegend') return settings.showLegend
  if (key === 'wetDry') return settings.showWetDryKey
  if (key === 'north') return settings.showNorth
  return settings.showScale
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(value: boolean): void
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  )
}

function SectionHeading({ children }: { children: string }) {
  return <h4 className="element-settings-heading">{children}</h4>
}

function BoxControls({
  style,
  onChange,
}: {
  style: ElementBoxStyle
  onChange(patch: Partial<ElementBoxStyle>): void
}) {
  return (
    <>
      <Toggle
        label="Background"
        checked={style.background}
        onChange={(background) => onChange({ background })}
      />
      <div className="field-grid two">
        <label className="field color-field">
          <span>Background</span>
          <input
            type="color"
            value={style.backgroundColor}
            disabled={!style.background}
            onChange={(event) =>
              onChange({ backgroundColor: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>
            Opacity <small>{Math.round(style.backgroundOpacity * 100)}%</small>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={style.backgroundOpacity}
            disabled={!style.background}
            onChange={(event) =>
              onChange({
                backgroundOpacity: numberValue(event.target.value, 0.88),
              })
            }
          />
        </label>
      </div>
      <div className="field-grid two">
        <label className="field color-field">
          <span>Border</span>
          <input
            type="color"
            value={style.borderColor}
            onChange={(event) => onChange({ borderColor: event.target.value })}
          />
        </label>
        <label className="field">
          <span>
            Border width <small>px</small>
          </span>
          <input
            type="number"
            min="0"
            max="8"
            step="0.5"
            value={style.borderWidth}
            onChange={(event) =>
              onChange({ borderWidth: numberValue(event.target.value, 1) })
            }
          />
        </label>
      </div>
    </>
  )
}

function PositionControls({
  position,
  label,
  onChange,
  onNudge,
}: {
  position: ElementPosition
  label: string
  onChange(patch: Partial<ElementPosition>): void
  onNudge(dx: number, dy: number): void
}) {
  return (
    <>
      <label className="field">
        <span>Anchor</span>
        <select
          value={position.anchor}
          onChange={(event) =>
            onChange({ anchor: event.target.value as Anchor })
          }
        >
          {ANCHORS.map((anchor) => (
            <option value={anchor.value} key={anchor.value}>
              {anchor.label}
            </option>
          ))}
        </select>
      </label>
      <div className="element-position-row">
        <span>
          Offset <small>{position.offX}, {position.offY} px</small>
        </span>
        <div className="nudge-buttons">
          <NudgeButton
            label={`Move ${label} left`}
            onClick={() => onNudge(-10, 0)}
          >
            <ArrowLeft size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} up`}
            onClick={() => onNudge(0, -10)}
          >
            <ArrowUp size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} down`}
            onClick={() => onNudge(0, 10)}
          >
            <ArrowDown size={14} />
          </NudgeButton>
          <NudgeButton
            label={`Move ${label} right`}
            onClick={() => onNudge(10, 0)}
          >
            <ArrowRight size={14} />
          </NudgeButton>
        </div>
      </div>
    </>
  )
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      className="icon-button tiny"
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function FigureElementsPanel({
  settings,
  activeElement,
  onActiveElementChange,
  onVisibilityChange,
  onTitleTemplateChange,
  onStyleChange,
  onPositionChange,
  onNudge,
  onResetElement,
}: Props) {
  const activeIndex = ELEMENTS.findIndex(
    (element) => element.key === activeElement,
  )
  const activeDefinition = ELEMENTS[activeIndex]
  const position = settings.elementPositions[activeElement]
  const visible = visibleFor(settings, activeElement)

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % ELEMENTS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + ELEMENTS.length) % ELEMENTS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = ELEMENTS.length - 1
    } else {
      return
    }
    event.preventDefault()
    onActiveElementChange(ELEMENTS[nextIndex].key)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }

  const commonHeader = (
    <>
      <div className="element-menu-header">
        <strong>{activeDefinition.label}</strong>
        <button
          className="button secondary compact element-reset"
          type="button"
          onClick={() => onResetElement(activeElement)}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>
      <Toggle
        label="Show on figure"
        checked={visible}
        onChange={(nextVisible) =>
          onVisibilityChange(activeElement, nextVisible)
        }
      />
    </>
  )

  return (
    <>
      <div
        className="element-switcher"
        role="tablist"
        aria-label="Figure elements"
      >
        {ELEMENTS.map((element, index) => {
          const Icon = element.icon
          const elementVisible = visibleFor(settings, element.key)
          return (
            <button
              className={`element-tab${activeElement === element.key ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeElement === element.key}
              title={element.label}
              key={element.key}
              onClick={() => onActiveElementChange(element.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{element.label}</span>
              {elementVisible ? (
                <Eye className="element-visibility" size={11} aria-hidden="true" />
              ) : (
                <EyeOff
                  className="element-visibility is-hidden"
                  size={11}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="element-settings-panel">
        {commonHeader}

        {activeElement === 'title' ? (
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
                  value={settings.elementStyles.title.fontSize}
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
                  value={settings.elementStyles.title.fontWeight}
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
                  value={settings.elementStyles.title.textColor}
                  onChange={(event) =>
                    onStyleChange('title', { textColor: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Alignment</span>
                <select
                  value={settings.elementStyles.title.alignment}
                  onChange={(event) =>
                    onStyleChange('title', {
                      alignment: event.target.value as
                        | 'left'
                        | 'center'
                        | 'right',
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
                value={settings.elementStyles.title.maxWidth}
                onChange={(event) =>
                  onStyleChange('title', {
                    maxWidth: numberValue(event.target.value, 1100),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {activeElement === 'diffLegend' ? (
          <>
            <SectionHeading>Content</SectionHeading>
            <div className="field-grid two">
              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={settings.elementStyles.diffLegend.title}
                  onChange={(event) =>
                    onStyleChange('diffLegend', { title: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Units</span>
                <input
                  type="text"
                  value={settings.elementStyles.diffLegend.units}
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
                  value={settings.elementStyles.diffLegend.orientation}
                  onChange={(event) =>
                    onStyleChange('diffLegend', {
                      orientation: event.target.value as
                        | 'vertical'
                        | 'horizontal',
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
                  value={settings.elementStyles.diffLegend.decimalPlaces}
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
                  value={settings.elementStyles.diffLegend.fontSize}
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
                  value={settings.elementStyles.diffLegend.swatchSize}
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
                value={settings.elementStyles.diffLegend.textColor}
                onChange={(event) =>
                  onStyleChange('diffLegend', {
                    textColor: event.target.value,
                  })
                }
              />
            </label>
          </>
        ) : null}

        {activeElement === 'wetDry' ? (
          <>
            <SectionHeading>Content</SectionHeading>
            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={settings.elementStyles.wetDry.title}
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
                  value={settings.elementStyles.wetDry.wetLabel}
                  onChange={(event) =>
                    onStyleChange('wetDry', { wetLabel: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Dry label</span>
                <input
                  type="text"
                  value={settings.elementStyles.wetDry.dryLabel}
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
                  value={settings.elementStyles.wetDry.orientation}
                  onChange={(event) =>
                    onStyleChange('wetDry', {
                      orientation: event.target.value as
                        | 'vertical'
                        | 'horizontal',
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
                  value={settings.elementStyles.wetDry.fontSize}
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
                  value={settings.elementStyles.wetDry.swatchSize}
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
                  value={settings.elementStyles.wetDry.textColor}
                  onChange={(event) =>
                    onStyleChange('wetDry', {
                      textColor: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          </>
        ) : null}

        {activeElement === 'north' ? (
          <>
            <SectionHeading>Symbol</SectionHeading>
            <div className="field-grid two">
              <label className="field">
                <span>Style</span>
                <select
                  value={settings.elementStyles.north.style}
                  onChange={(event) =>
                    onStyleChange('north', {
                      style: event.target.value as
                        | 'classic'
                        | 'simple'
                        | 'compass',
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
                  value={settings.elementStyles.north.size}
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
                  value={settings.elementStyles.north.color}
                  onChange={(event) =>
                    onStyleChange('north', { color: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Orientation</span>
                <select
                  value={settings.elementStyles.north.rotationMode}
                  onChange={(event) =>
                    onStyleChange('north', {
                      rotationMode: event.target.value as
                        | 'true-north'
                        | 'page-up',
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
              checked={settings.elementStyles.north.showLabel}
              onChange={(showLabel) =>
                onStyleChange('north', { showLabel })
              }
            />
          </>
        ) : null}

        {activeElement === 'scale' ? (
          <>
            <SectionHeading>Scale</SectionHeading>
            <div className="field-grid two">
              <label className="field">
                <span>Length</span>
                <select
                  value={settings.elementStyles.scale.lengthMode}
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
                  value={settings.elementStyles.scale.units}
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
            {settings.elementStyles.scale.lengthMode === 'manual' ? (
              <label className="field">
                <span>Map length</span>
                <input
                  type="number"
                  min="0.01"
                  step="1"
                  value={settings.elementStyles.scale.manualLength}
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
                  value={settings.elementStyles.scale.divisions}
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
                  value={settings.elementStyles.scale.style}
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
                  value={settings.elementStyles.scale.decimalPlaces}
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
                  value={settings.elementStyles.scale.fontSize}
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
                  value={settings.elementStyles.scale.lineColor}
                  onChange={(event) =>
                    onStyleChange('scale', { lineColor: event.target.value })
                  }
                />
              </label>
              <label className="field color-field">
                <span>Fill</span>
                <input
                  type="color"
                  value={settings.elementStyles.scale.fillColor}
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
                value={settings.elementStyles.scale.textColor}
                onChange={(event) =>
                  onStyleChange('scale', { textColor: event.target.value })
                }
              />
            </label>
          </>
        ) : null}

        <SectionHeading>Appearance</SectionHeading>
        <BoxControls
          style={settings.elementStyles[activeElement]}
          onChange={(patch) => onStyleChange(activeElement, patch)}
        />
        <SectionHeading>Placement</SectionHeading>
        <PositionControls
          position={position}
          label={activeDefinition.label}
          onChange={(patch) => onPositionChange(activeElement, patch)}
          onNudge={(dx, dy) => onNudge(activeElement, dx, dy)}
        />
      </div>
    </>
  )
}
