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
          <TitleElementEditor
            settings={settings}
            onStyleChange={onStyleChange}
            onTitleTemplateChange={onTitleTemplateChange}
          />
        ) : null}
        {activeMapElement === 'diffLegend' ? (
          <DifferenceLegendEditor
            settings={settings}
            onStyleChange={onStyleChange}
          />
        ) : null}
        {activeMapElement === 'wetDry' ? (
          <WetDryKeyEditor settings={settings} onStyleChange={onStyleChange} />
        ) : null}
        {activeMapElement === 'north' ? (
          <NorthArrowEditor settings={settings} onStyleChange={onStyleChange} />
        ) : null}
        {activeMapElement === 'scale' ? (
          <ScaleBarEditor settings={settings} onStyleChange={onStyleChange} />
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
