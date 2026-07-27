import { cloneDefaultElementStyles } from './figureElements'
import { DEFAULT_ELEMENT_POSITIONS } from './mapRenderer'
import type { AnnotationDefaults, FigureSettings } from './types'

export function createDefaultFigureSettings(): FigureSettings {
  return {
    orientation: 'landscape',
    dryDepth: 0,
    differenceOutlineColor: '#111111',
    showDifferenceOutlines: true,
    showWetDry: true,
    showOverlays: true,
    showTitle: true,
    showLegend: true,
    showNorth: true,
    showScale: true,
    showWetDryKey: true,
    titleTemplate: '{type} - {existing} vs {proposed}',
    legendBound: null,
    legendInterval: null,
    legendFontSize: 19,
    newlyWetColor: '#2cc88b',
    newlyDryColor: '#e97768',
    basemapOpacity: 0.72,
    rotation: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    elementPositions: structuredClone(DEFAULT_ELEMENT_POSITIONS),
    elementStyles: cloneDefaultElementStyles(),
  }
}

export function createDefaultAnnotationSettings(): AnnotationDefaults {
  return {
    text: 'Note',
    color: '#b42318',
    fillColor: '#ffffff',
    lineWidth: 3,
    fontSize: 20,
    rotation: 0,
    dashed: false,
    background: true,
    resultField: 'summary',
  }
}
