import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import type {
  ChartLinePattern,
  ChartLineStyle,
  ChartSeriesControl,
} from '../../core/contracts/chartStyle'
import {
  chartLinePattern,
  withChartLinePattern,
} from '../../core/chartStyle'

type Props<Id extends string | number> = {
  series: readonly ChartSeriesControl<Id>[]
  onLabelChange(id: Id, label: string): void
  onStyleChange(id: Id, style: ChartLineStyle): void
  onVisibilityChange(id: Id, visible: boolean): void
  onMove(id: Id, direction: -1 | 1): void
}

export function ChartSeriesControls<Id extends string | number>({
  series,
  onLabelChange,
  onStyleChange,
  onVisibilityChange,
  onMove,
}: Props<Id>) {
  if (series.length === 0) {
    return <div className="chart-series-empty">Generate or select chart data to style its series.</div>
  }
  return (
    <div className="chart-series-list">
      {series.map((item, index) => (
        <div className="chart-series-row" key={item.id} data-visible={item.visible}>
          <div className="chart-series-heading">
            <button
              className="icon-button compact"
              type="button"
              aria-label={`${item.visible ? 'Hide' : 'Show'} ${item.label}`}
              title={`${item.visible ? 'Hide' : 'Show'} series`}
              onClick={() => onVisibilityChange(item.id, !item.visible)}
            >
              {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <input
              aria-label={`Series ${index + 1} legend name`}
              value={item.label}
              onChange={(event) => onLabelChange(item.id, event.currentTarget.value)}
            />
            <div className="chart-series-order">
              <button className="icon-button compact" type="button" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => onMove(item.id, -1)}><ChevronUp size={14} /></button>
              <button className="icon-button compact" type="button" aria-label={`Move ${item.label} down`} disabled={index === series.length - 1} onClick={() => onMove(item.id, 1)}><ChevronDown size={14} /></button>
            </div>
          </div>
          <div className="chart-series-fields">
            <label><span>Color</span><input aria-label={`${item.label} color`} type="color" value={item.style.color} onChange={(event) => onStyleChange(item.id, { ...item.style, color: event.currentTarget.value })} /></label>
            <label><span>Width</span><input aria-label={`${item.label} width`} type="number" min="0.5" max="8" step="0.25" value={item.style.width} onChange={(event) => onStyleChange(item.id, { ...item.style, width: Math.min(8, Math.max(0.5, Number(event.currentTarget.value) || 0.5)) })} /></label>
            <label><span>Pattern</span><select aria-label={`${item.label} pattern`} value={chartLinePattern(item.style)} onChange={(event) => onStyleChange(item.id, withChartLinePattern(item.style, event.currentTarget.value as ChartLinePattern))}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="dash-dot">Dash-dot</option></select></label>
          </div>
        </div>
      ))}
    </div>
  )
}
