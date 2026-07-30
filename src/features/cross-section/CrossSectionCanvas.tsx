import { LineChart, Map } from 'lucide-react'
import {
  useRef,
  type PointerEventHandler,
  type RefObject,
} from 'react'
import { FRAMES } from '../../core/mapRenderer'
import type {
  HydraulicCrossSectionScene,
  WseDifferenceScene,
} from '../../core/types'
import { useFittedCanvasAspect } from '../figures/useFittedCanvasAspect'
import { CROSS_SECTION_FRAMES } from './crossSectionRenderer'

type Props = {
  view: 'map' | 'chart'
  mapScene: WseDifferenceScene | null
  chartScene: HydraulicCrossSectionScene | null
  ready: boolean
  drawing: boolean
  drawingStartSet: boolean
  orientation: 'landscape' | 'portrait'
  canvasRef: RefObject<HTMLCanvasElement | null>
  onViewChange(view: 'map' | 'chart'): void
  onGenerateMap(): void
  onPointerDown: PointerEventHandler<HTMLCanvasElement>
}

export function CrossSectionCanvas({
  view,
  mapScene,
  chartScene,
  ready,
  drawing,
  drawingStartSet,
  orientation,
  canvasRef,
  onViewChange,
  onGenerateMap,
  onPointerDown,
}: Props) {
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const visible = view === 'map' ? Boolean(mapScene) : Boolean(chartScene)
  const aspect =
    view === 'map'
      ? FRAMES.landscape.width / FRAMES.landscape.height
      : CROSS_SECTION_FRAMES[orientation].width /
        CROSS_SECTION_FRAMES[orientation].height
  const displaySize = useFittedCanvasAspect(
    canvasFrameRef,
    aspect,
    10,
  )
  return (
    <>
      <div className="cross-section-view-tabs" role="tablist" aria-label="Cross-section workspace view">
        <button
          className={view === 'map' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={view === 'map'}
          onClick={() => onViewChange('map')}
        >
          <Map size={15} aria-hidden="true" />
          Select line
        </button>
        <button
          className={view === 'chart' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={view === 'chart'}
          disabled={!chartScene}
          onClick={() => onViewChange('chart')}
        >
          <LineChart size={15} aria-hidden="true" />
          Cross section
        </button>
      </div>
      {!visible ? (
        <div className="map-empty">
          <div className="empty-symbol">
            {view === 'map' ? <Map size={28} /> : <LineChart size={28} />}
          </div>
          <h2>
            {view === 'map' ? 'Select a cross-section line' : 'Generate a cross section'}
          </h2>
          <p>
            {view === 'map'
              ? 'Add Baseline and Comparison model files, then use an assessment line or draw a two-point section.'
              : 'Choose a line on the map and generate its hydraulic comparison.'}
          </p>
          {view === 'map' ? (
            <button
              className="button primary"
              type="button"
              disabled={!ready}
              onClick={onGenerateMap}
            >
              <Map size={17} aria-hidden="true" />
              Build selection map
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="map-canvas-frame" ref={canvasFrameRef}>
        <canvas
          ref={canvasRef}
          className={visible ? 'map-canvas is-visible' : 'map-canvas'}
          aria-label={
            view === 'map'
              ? 'Cross-section selection map'
              : 'Generated hydraulic cross-section comparison'
          }
          data-cross-section-drawing={drawing ? 'true' : undefined}
          onPointerDown={view === 'map' ? onPointerDown : undefined}
          style={{
            width: displaySize.width || undefined,
            height: displaySize.height || undefined,
          }}
        />
      </div>
      {view === 'map' && drawing ? (
        <div className="cross-section-drawing-hint" role="status">
          <strong>
            {drawingStartSet ? 'Endpoint A set' : 'Draw cross section'}
          </strong>
          <span>
            {drawingStartSet
              ? 'Click endpoint B · Esc to cancel'
              : 'Click endpoint A · Esc to cancel'}
          </span>
        </div>
      ) : null}
    </>
  )
}
