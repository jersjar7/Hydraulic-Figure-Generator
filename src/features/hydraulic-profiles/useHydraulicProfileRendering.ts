import { useEffect, type RefObject } from 'react'
import type {
  HydraulicLongitudinalScene,
  HydraulicProfileScene,
  HydraulicProfileView,
} from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { renderHydraulicLongitudinalDocument } from './hydraulicLongitudinalRenderer'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'
import type { LongitudinalStationLabelBounds } from '../chart-tools/longitudinalStationLabels'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  longitudinalLabelBoundsRef: RefObject<LongitudinalStationLabelBounds[]>
  view: HydraulicProfileView
  scene: HydraulicProfileScene | null
  longitudinalScene: HydraulicLongitudinalScene | null
  settings: HydraulicProfileFigureSettings
}

export function useHydraulicProfileRendering({
  canvasRef,
  longitudinalLabelBoundsRef,
  view,
  scene,
  longitudinalScene,
  settings,
}: Options) {
  useEffect(() => {
    if (!canvasRef.current) return
    if (view === 'longitudinal' && longitudinalScene) {
      longitudinalLabelBoundsRef.current = renderHydraulicLongitudinalDocument(canvasRef.current, {
        scene: longitudinalScene,
        settings,
      })
    } else if (view === 'cross-sections' && scene) {
      longitudinalLabelBoundsRef.current = []
      void hydraulicProfileFigure.render({
        canvas: canvasRef.current,
        document: { scene, settings },
      })
    }
  }, [canvasRef, longitudinalLabelBoundsRef, longitudinalScene, scene, settings, view])
}
