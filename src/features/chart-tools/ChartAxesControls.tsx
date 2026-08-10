import type { ChartAxesSettings } from '../../core/contracts/chartStyle'
import { CompactFieldGrid } from '../../components/settings/CompactFieldGrid'
import { Toggle } from '../../components/settings/Toggle'

type Props = {
  axes: ChartAxesSettings
  onChange(value: ChartAxesSettings): void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function nullableNumber(value: string) {
  return value === '' ? null : Number(value)
}

export function ChartAxesControls({ axes, onChange }: Props) {
  return (
    <div className="chart-tool-stack">
      <CompactFieldGrid>
        <Field label="X-axis label">
          <input value={axes.xLabel} onChange={(event) => onChange({ ...axes, xLabel: event.currentTarget.value })} />
        </Field>
        <Field label="Y-axis label">
          <input value={axes.yLabel} onChange={(event) => onChange({ ...axes, yLabel: event.currentTarget.value })} />
        </Field>
      </CompactFieldGrid>
      <CompactFieldGrid>
        <Field label="Y minimum">
          <input aria-label="Y minimum" type="number" step="0.1" placeholder="Auto" value={axes.yMinimum ?? ''} onChange={(event) => onChange({ ...axes, yMinimum: nullableNumber(event.currentTarget.value) })} />
        </Field>
        <Field label="Y maximum">
          <input aria-label="Y maximum" type="number" step="0.1" placeholder="Auto" value={axes.yMaximum ?? ''} onChange={(event) => onChange({ ...axes, yMaximum: nullableNumber(event.currentTarget.value) })} />
        </Field>
      </CompactFieldGrid>
      <Toggle label="Grid" checked={axes.showGrid} onChange={(showGrid) => onChange({ ...axes, showGrid })} />
      <CompactFieldGrid>
        <Field label="Text size">
          <input type="number" min="8" max="40" value={axes.fontSize} onChange={(event) => onChange({ ...axes, fontSize: Math.min(40, Math.max(8, Number(event.currentTarget.value) || 8)) })} />
        </Field>
        <Field label="Text color">
          <input type="color" value={axes.textColor} onChange={(event) => onChange({ ...axes, textColor: event.currentTarget.value })} />
        </Field>
        <Field label="Grid color">
          <input type="color" value={axes.gridColor} onChange={(event) => onChange({ ...axes, gridColor: event.currentTarget.value })} />
        </Field>
        <Field label="Plot fill">
          <input type="color" value={axes.plotBackgroundColor} onChange={(event) => onChange({ ...axes, plotBackgroundColor: event.currentTarget.value })} />
        </Field>
        <Field label="Frame color">
          <input type="color" value={axes.frameColor} onChange={(event) => onChange({ ...axes, frameColor: event.currentTarget.value })} />
        </Field>
        <Field label="Frame width">
          <input type="number" min="0.5" max="8" step="0.25" value={axes.frameWidth} onChange={(event) => onChange({ ...axes, frameWidth: Math.min(8, Math.max(0.5, Number(event.currentTarget.value) || 0.5)) })} />
        </Field>
      </CompactFieldGrid>
    </div>
  )
}
