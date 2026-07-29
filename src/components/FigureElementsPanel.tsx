import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type {
  ElementPosition,
  FigureSettings,
  FigureElementPanelKey,
  CenterlineStationTick,
  MapElementKey,
  MapElementStyles,
} from '../core/types'
import { CenterlineStationingPanel } from '../features/stationing/CenterlineStationingPanel'
import {
  BoxControls,
  PositionControls,
  SectionHeading,
  Toggle,
} from './figure-elements/elementControls'
import {
  FIGURE_ELEMENTS,
  isElementVisible,
} from './figure-elements/elementDefinitions'
import { numberValue } from './figure-elements/numberValue'

type Props = {
  settings: FigureSettings
  activeElement: FigureElementPanelKey
  onActiveElementChange(key: FigureElementPanelKey): void
  onVisibilityChange(key: MapElementKey, visible: boolean): void
  onTitleTemplateChange(value: string): void
  onStyleChange(
    key: MapElementKey,
    patch: Partial<MapElementStyles[MapElementKey]>,
  ): void
  onPositionChange(key: MapElementKey, patch: Partial<ElementPosition>): void
  onNudge(key: MapElementKey, dx: number, dy: number): void
  onResetElement(key: MapElementKey): void
  stationTicks: CenterlineStationTick[]
  selectedStationLabelId: string | null
  hasCenterline: boolean
  onStationingChange(
    patch: Partial<FigureSettings['centerlineStationing']>,
  ): void
  onStationLabelSelect(id: string | null): void
  onStationLabelOverrideChange(
    id: string,
    override: FigureSettings['centerlineStationing']['overrides'][string] | null,
  ): void
  onNudgeStationLabel(dx: number, dy: number): void
  onResetStationing(): void
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
  stationTicks,
  selectedStationLabelId,
  hasCenterline,
  onStationingChange,
  onStationLabelSelect,
  onStationLabelOverrideChange,
  onNudgeStationLabel,
  onResetStationing,
}: Props) {
  const activeIndex = FIGURE_ELEMENTS.findIndex(
    (element) => element.key === activeElement,
  )
  const activeDefinition = FIGURE_ELEMENTS[activeIndex]
  const activeMapElement =
    activeElement === 'stationing' ? null : activeElement
  const position = activeMapElement
    ? settings.elementPositions[activeMapElement]
    : null
  const visible = activeMapElement
    ? isElementVisible(settings, activeMapElement)
    : settings.centerlineStationing.visible

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % FIGURE_ELEMENTS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (index - 1 + FIGURE_ELEMENTS.length) % FIGURE_ELEMENTS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = FIGURE_ELEMENTS.length - 1
    } else {
      return
    }
    event.preventDefault()
    onActiveElementChange(FIGURE_ELEMENTS[nextIndex].key)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }

  const commonHeader = activeMapElement ? (
    <>
      <div className="element-menu-header">
        <strong>{activeDefinition.label}</strong>
        <button
          className="button secondary compact element-reset"
          type="button"
          onClick={() => onResetElement(activeMapElement)}
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      </div>
      <Toggle
        label="Show on figure"
        checked={visible}
        onChange={(nextVisible) =>
          onVisibilityChange(activeMapElement, nextVisible)
        }
      />
    </>
  ) : null

  return (
    <>
      <div
        className="element-switcher"
        role="tablist"
        aria-label="Figure elements"
      >
        {FIGURE_ELEMENTS.map((element, index) => {
          const Icon = element.icon
          const elementVisible =
            element.key === 'stationing'
              ? settings.centerlineStationing.visible
              : isElementVisible(settings, element.key)
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
        {activeElement === 'stationing' ? (
          <CenterlineStationingPanel
            settings={settings.centerlineStationing}
            ticks={stationTicks}
            selectedLabelId={selectedStationLabelId}
            hasCenterline={hasCenterline}
            onChange={onStationingChange}
            onSelectLabel={onStationLabelSelect}
            onOverrideChange={onStationLabelOverrideChange}
            onNudgeSelected={onNudgeStationLabel}
            onReset={onResetStationing}
          />
        ) : (
          <>
            {commonHeader}

        {activeMapElement === 'title' ? (
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

        {activeMapElement === 'diffLegend' ? (
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

        {activeMapElement === 'wetDry' ? (
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

        {activeMapElement === 'north' ? (
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

        {activeMapElement === 'scale' ? (
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
          style={settings.elementStyles[activeMapElement!]}
          onChange={(patch) => onStyleChange(activeMapElement!, patch)}
        />
        <SectionHeading>Placement</SectionHeading>
        <PositionControls
          position={position!}
          label={activeDefinition.label}
          onChange={(patch) => onPositionChange(activeMapElement!, patch)}
          onNudge={(dx, dy) => onNudge(activeMapElement!, dx, dy)}
        />
          </>
        )}
      </div>
    </>
  )
}
