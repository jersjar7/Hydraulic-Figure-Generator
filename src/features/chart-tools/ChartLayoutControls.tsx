import type {
  ChartLayoutSettings,
  ChartLegendSettings,
} from '../../core/contracts/chartStyle'
import { CompactFieldGrid } from '../../components/settings/CompactFieldGrid'
import { Toggle } from '../../components/settings/Toggle'

type Props = {
  layout: ChartLayoutSettings
  legend: ChartLegendSettings
  onLayoutChange(value: ChartLayoutSettings): void
  onLegendChange(value: ChartLegendSettings): void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function ChartLayoutControls({
  layout,
  legend,
  onLayoutChange,
  onLegendChange,
}: Props) {
  return (
    <div className="chart-tool-stack">
      <Field label="Figure title">
        <textarea
          rows={2}
          value={layout.title}
          onChange={(event) => onLayoutChange({ ...layout, title: event.currentTarget.value })}
        />
      </Field>
      <div className="segmented" aria-label="Figure orientation">
        {(['landscape', 'portrait'] as const).map((orientation) => (
          <button
            className={layout.orientation === orientation ? 'active' : ''}
            type="button"
            key={orientation}
            onClick={() => onLayoutChange({ ...layout, orientation })}
          >
            {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
          </button>
        ))}
      </div>
      <Toggle
        label="Legend"
        checked={legend.visible}
        onChange={(visible) => onLegendChange({ ...legend, visible })}
      />
      {legend.visible ? (
        <>
          <Field label="Legend position">
            <select
              value={legend.position}
              onChange={(event) => onLegendChange({
                ...legend,
                position: event.currentTarget.value as ChartLegendSettings['position'],
              })}
            >
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
            </select>
          </Field>
          <CompactFieldGrid>
            <Field label="Legend fill">
              <input
                type="color"
                value={legend.backgroundColor}
                onChange={(event) => onLegendChange({ ...legend, backgroundColor: event.currentTarget.value })}
              />
            </Field>
            <Field label="Legend border">
              <input
                type="color"
                value={legend.borderColor}
                onChange={(event) => onLegendChange({ ...legend, borderColor: event.currentTarget.value })}
              />
            </Field>
            <Field label="Fill opacity">
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={legend.backgroundOpacity}
                onChange={(event) => onLegendChange({
                  ...legend,
                  backgroundOpacity: Math.min(1, Math.max(0, Number(event.currentTarget.value) || 0)),
                })}
              />
            </Field>
          </CompactFieldGrid>
        </>
      ) : null}
    </div>
  )
}
