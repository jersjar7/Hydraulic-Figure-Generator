import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type {
  ElementPosition,
  FigureSettings,
  FigureElementPanelKey,
  MapElementKey,
  MapElementStyles,
} from '../core/types'
import {
  BoxControls,
  PositionControls,
  SectionHeading,
  Toggle,
} from './figure-elements/elementControls'
import { DifferenceLegendEditor } from './figure-elements/DifferenceLegendEditor'
import {
  FIGURE_ELEMENTS,
  isElementVisible,
} from './figure-elements/elementDefinitions'
import { NorthArrowEditor } from './figure-elements/NorthArrowEditor'
import { ScaleBarEditor } from './figure-elements/ScaleBarEditor'
import { TitleElementEditor } from './figure-elements/TitleElementEditor'
import { WetDryKeyEditor } from './figure-elements/WetDryKeyEditor'

type Props = {
  settings: FigureSettings
  availableElements?: readonly FigureElementPanelKey[]
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
}

export function FigureElementsPanel({
  settings,
  availableElements,
  activeElement,
  onActiveElementChange,
  onVisibilityChange,
  onTitleTemplateChange,
  onStyleChange,
  onPositionChange,
  onNudge,
  onResetElement,
}: Props) {
  const elementDefinitions = availableElements
    ? FIGURE_ELEMENTS.filter((element) =>
        availableElements.includes(element.key),
      )
    : FIGURE_ELEMENTS
  const activeIndex = elementDefinitions.findIndex(
    (element) => element.key === activeElement,
  )
  const activeDefinition = elementDefinitions[Math.max(0, activeIndex)]
  const position = settings.elementPositions[activeElement]
  const visible = isElementVisible(settings, activeElement)

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % elementDefinitions.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (index - 1 + elementDefinitions.length) % elementDefinitions.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = elementDefinitions.length - 1
    } else {
      return
    }
    event.preventDefault()
    onActiveElementChange(elementDefinitions[nextIndex].key)
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
        {elementDefinitions.map((element, index) => {
          const Icon = element.icon
          const elementVisible = isElementVisible(settings, element.key)
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
          <TitleElementEditor
            settings={settings}
            onStyleChange={onStyleChange}
            onTitleTemplateChange={onTitleTemplateChange}
          />
        ) : null}
        {activeElement === 'diffLegend' ? (
          <DifferenceLegendEditor
            settings={settings}
            onStyleChange={onStyleChange}
          />
        ) : null}
        {activeElement === 'wetDry' ? (
          <WetDryKeyEditor settings={settings} onStyleChange={onStyleChange} />
        ) : null}
        {activeElement === 'north' ? (
          <NorthArrowEditor settings={settings} onStyleChange={onStyleChange} />
        ) : null}
        {activeElement === 'scale' ? (
          <ScaleBarEditor settings={settings} onStyleChange={onStyleChange} />
        ) : null}
        <SectionHeading>Appearance</SectionHeading>
        <BoxControls
          style={settings.elementStyles[activeElement]}
          onChange={(patch) => onStyleChange(activeElement, patch)}
        />
        <SectionHeading>Placement</SectionHeading>
        <PositionControls
          position={position!}
          label={activeDefinition.label}
          onChange={(patch) => onPositionChange(activeElement, patch)}
          onNudge={(dx, dy) => onNudge(activeElement, dx, dy)}
        />
      </div>
    </>
  )
}
