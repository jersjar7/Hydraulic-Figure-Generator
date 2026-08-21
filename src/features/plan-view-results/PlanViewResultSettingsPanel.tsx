import { Download, FileJson } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { ControlSection } from '../../components/ControlSection'
import { FigureElementsPanel } from '../../components/FigureElementsPanel'
import { SCALAR_COLOR_RAMP_OPTIONS } from '../../core/colorRamps'
import type {
  CartographySettings,
  FigureElementPanelKey,
  PlanViewResultSettings,
  PlanViewOutputOption,
} from '../../core/types'
import type { useMapElementController } from '../figures/useMapElementController'
import { CenterlineStationingToolPanel } from '../stationing/CenterlineStationingToolPanel'
import { AnnotationSettingsPanel } from '../annotations/components/AnnotationSettingsPanel'
import type { usePlanViewAnnotations } from './usePlanViewAnnotations'
import { FrameSettingsPanel } from '../wse-difference/components/FrameSettingsPanel'
import { Toggle } from '../../components/settings/Toggle'
import { CartographyPanel } from '../cartography/CartographyPanel'
import type { FigureSettingsChange } from '../wse-difference/settingsPanelTypes'
import type { PlanViewResultSettingsSectionKey } from './planViewResultDefinition'
import { planViewCartographySettings } from './planViewCartography'
import { VelocityVectorSettingsPanel } from '../velocity-vectors/VelocityVectorSettingsPanel'

type Props = {
  section: PlanViewResultSettingsSectionKey
  settings: PlanViewResultSettings
  resultOptions: PlanViewOutputOption[]
  velocityAvailable: boolean
  activeElement: FigureElementPanelKey
  elements: ReturnType<typeof useMapElementController<PlanViewResultSettings>>
  stationing: ComponentProps<typeof CenterlineStationingToolPanel>
  annotations: ReturnType<typeof usePlanViewAnnotations>['controller']
  canDownload: boolean
  exportActions: ReactNode
  onSettingsChange<Key extends keyof PlanViewResultSettings>(
    key: Key,
    value: PlanViewResultSettings[Key],
  ): void
  onResultParameterChange(paramName: string): void
  onCartographyChange(value: CartographySettings): void
  onActiveElementChange(element: FigureElementPanelKey): void
  onDownload(): void
}

export function PlanViewResultSettingsPanel(props: Props) {
  const {
    section,
    settings,
    resultOptions,
    velocityAvailable,
    activeElement,
    elements,
    stationing,
    annotations,
    canDownload,
    exportActions,
    onSettingsChange,
    onResultParameterChange,
    onCartographyChange,
    onActiveElementChange,
    onDownload,
  } = props
  const selectedOutput = resultOptions.find(
    (option) => option.paramName === settings.resultParameter,
  )
  if (section === 'result') {
    return (
      <ControlSection>
        <label className="field">
          <span>Map content</span>
          <select
            value={settings.resultParameter}
            disabled={resultOptions.length === 0}
            onChange={(event) =>
              onResultParameterChange(event.currentTarget.value)
            }
          >
            {resultOptions.length === 0 ? (
              <option value="">Add scenario geometry</option>
            ) : (
              <>
                <optgroup label="Geometry">
                  {resultOptions.filter((option) => !option.runDependent).map((option) => (
                    <option value={option.paramName} key={option.paramName}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hydraulic results">
                  {resultOptions.filter((option) => option.runDependent).map((option) => (
                    <option value={option.paramName} key={option.paramName}>
                      {option.label}{option.units ? ` (${option.units})` : ''}
                    </option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
        </label>
        <Toggle
          label="Shapefile overlays"
          checked={settings.showOverlays}
          onChange={(checked) => onSettingsChange('showOverlays', checked)}
        />
      </ControlSection>
    )
  }
  if (section === 'cartography') {
    const showsClassification = selectedOutput?.kind !== 'mesh-elements'
    const showsMesh =
      selectedOutput?.kind === 'mesh-elements' ||
      selectedOutput?.kind === 'topography-mesh-elements'
    const cartography = planViewCartographySettings(settings)
    return (
      <CartographyPanel
        value={{
          ...cartography,
          contours: showsClassification ? cartography.contours : null,
          mesh: showsMesh ? cartography.mesh : null,
        }}
        defaultRamp={selectedOutput?.defaultRamp ?? settings.ramp}
        rampOptions={SCALAR_COLOR_RAMP_OPTIONS}
        units={selectedOutput?.units}
        showClassification={showsClassification}
        onChange={(next) => onCartographyChange({
          ...next,
          contours: showsClassification ? next.contours : cartography.contours,
          mesh: showsMesh ? next.mesh : cartography.mesh,
        })}
      />
    )
  }
  if (section === 'frame') {
    return (
      <FrameSettingsPanel
        settings={settings}
        onSettingsChange={onSettingsChange as FigureSettingsChange}
        onResetView={elements.resetView}
      />
    )
  }
  if (section === 'vectors') {
    return (
      <VelocityVectorSettingsPanel
        value={settings.velocityVectors}
        available={velocityAvailable}
        onChange={(value) => onSettingsChange('velocityVectors', value)}
      />
    )
  }
  if (section === 'elements') {
    return (
      <ControlSection>
        <FigureElementsPanel
          settings={settings}
          availableElements={selectedOutput?.kind === 'mesh-elements'
            ? ['title', 'north', 'scale']
            : ['title', 'diffLegend', 'north', 'scale']}
          activeElement={activeElement}
          onActiveElementChange={onActiveElementChange}
          onVisibilityChange={elements.updateElementVisibility}
          onLockChange={elements.updateElementLock}
          onTitleTemplateChange={(value) =>
            onSettingsChange('titleTemplate', value)
          }
          onStyleChange={elements.updateElementStyle}
          onPositionChange={elements.updateElementPosition}
          onNudge={elements.nudgeElement}
          onResetElement={elements.resetElement}
          onUndo={elements.undo}
          onRedo={elements.redo}
          canUndo={elements.canUndo}
          canRedo={elements.canRedo}
          undoLabel={elements.undoLabel}
          redoLabel={elements.redoLabel}
        />
      </ControlSection>
    )
  }
  if (section === 'stationing') {
    return <CenterlineStationingToolPanel {...stationing} />
  }
  if (section === 'annotations') {
    return <AnnotationSettingsPanel {...annotations} />
  }
  return (
    <ControlSection>
      <div className="export-note">
        <FileJson size={17} aria-hidden="true" />
        <span>
          Project files retain map settings and overlays. H5 files remain local
          and must be re-added.
        </span>
      </div>
      {exportActions}
      <button
        className="button secondary full"
        type="button"
        disabled={!canDownload}
        onClick={onDownload}
      >
        <Download size={17} aria-hidden="true" />
        Download map PNG
      </button>
    </ControlSection>
  )
}
