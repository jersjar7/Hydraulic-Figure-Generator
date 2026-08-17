import { LineChart } from 'lucide-react'
import { useRef, type RefObject } from 'react'
import type {
  HydraulicLongitudinalScene,
  HydraulicProfileScene,
  HydraulicProfileView,
} from '../../core/types'
import {
  fittedCanvasStyle,
  useFittedCanvasAspect,
} from '../figures/useFittedCanvasAspect'
import { HYDRAULIC_PROFILE_FRAMES } from './hydraulicProfileRenderer'
import { HydraulicProfileStationNavigator } from './HydraulicProfileStationNavigator'

type Props = {
  scene: HydraulicProfileScene | null
  longitudinalScene: HydraulicLongitudinalScene | null
  view: HydraulicProfileView
  scenes: HydraulicProfileScene[]
  selectedSectionId: string
  orientation: 'landscape' | 'portrait'
  canvasRef: RefObject<HTMLCanvasElement | null>
  onStationSelect(sectionId: string): void
  onViewChange(view: HydraulicProfileView): void
}

export function HydraulicProfileCanvas({
  scene,
  longitudinalScene,
  view,
  scenes,
  selectedSectionId,
  orientation,
  canvasRef,
  onStationSelect,
  onViewChange,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const frame = HYDRAULIC_PROFILE_FRAMES[orientation]
  const displaySize = useFittedCanvasAspect(
    frameRef,
    frame.width / frame.height,
  )
  return (
    <>
      <div className="cross-section-view-tabs" role="tablist" aria-label="Hydraulic profile figure type">
        <button className={view === 'cross-sections' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'cross-sections'} onClick={() => onViewChange('cross-sections')}>Cross sections</button>
        <button className={view === 'longitudinal' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'longitudinal'} onClick={() => onViewChange('longitudinal')}>Longitudinal profile</button>
      </div>
      {view === 'cross-sections' && !scene ? (
        <div className="map-empty">
          <div className="empty-symbol"><LineChart size={28} /></div>
          <h2>Build a hydraulic profile</h2>
          <p>Paste the SMS Summary Table and Profile Values, review the detected mapping, then generate every detected station.</p>
        </div>
      ) : null}
      {view === 'longitudinal' && !longitudinalScene ? (
        <div className="map-empty">
          <div className="empty-symbol"><LineChart size={28} /></div>
          <h2>Build a longitudinal profile</h2>
          <p>Add Longitudinal SMS Profile Values, then generate the profile.</p>
        </div>
      ) : null}
      {view === 'cross-sections' && scenes.length > 0 ? <HydraulicProfileStationNavigator scenes={scenes} selectedSectionId={selectedSectionId} onSelect={onStationSelect} /> : null}
      <div className={`map-canvas-frame${view === 'cross-sections' && scenes.length > 0 ? ' profile-canvas-with-stations' : ''}`} ref={frameRef}>
        <canvas
          ref={canvasRef}
          className={view === 'cross-sections' ? (scene ? 'map-canvas is-visible' : 'map-canvas') : (longitudinalScene ? 'map-canvas is-visible' : 'map-canvas')}
          aria-label="Generated SMS hydraulic profile"
          style={fittedCanvasStyle(displaySize)}
        />
      </div>
    </>
  )
}
