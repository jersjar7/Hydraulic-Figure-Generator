import { useEffect, type RefObject } from 'react'
import type {
  HydraulicLongitudinalScene,
  HydraulicProfileScene,
  HydraulicProfileView,
} from '../../core/types'
import { hydraulicProfileFigure } from './hydraulicProfileFigure'
import { renderHydraulicLongitudinalDocument } from './hydraulicLongitudinalRenderer'
import type { HydraulicProfileFigureSettings } from './hydraulicProfileSettings'

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  view: HydraulicProfileView
  scene: HydraulicProfileScene | null
  longitudinalScene: HydraulicLongitudinalScene | null
  settings: HydraulicProfileFigureSettings
}

export function useHydraulicProfileRendering({
  canvasRef,
  view,
  scene,
  longitudinalScene,
  settings,
}: Options) {
  useEffect(() => {
    if (!canvasRef.current) return
    if (view === 'longitudinal' && longitudinalScene) {
      renderHydraulicLongitudinalDocument(canvasRef.current, {
        scene: longitudinalScene,
        settings,
      })
    } else if (view === 'cross-sections' && scene) {
      void hydraulicProfileFigure.render({
        canvas: canvasRef.current,
        document: { scene, settings },
      })
    }
  }, [canvasRef, longitudinalScene, scene, settings, view])
}
