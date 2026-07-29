import {
  BarChart3,
  Compass,
  Droplets,
  Milestone,
  Ruler,
  Type,
} from 'lucide-react'
import type {
  Anchor,
  FigureElementPanelKey,
  FigureSettings,
  MapElementKey,
} from '../../core/types'

export const FIGURE_ELEMENTS = [
  { key: 'title', label: 'Title', icon: Type },
  { key: 'diffLegend', label: 'Difference legend', icon: BarChart3 },
  { key: 'wetDry', label: 'Wet/dry key', icon: Droplets },
  { key: 'north', label: 'North arrow', icon: Compass },
  { key: 'scale', label: 'Scale bar', icon: Ruler },
  { key: 'stationing', label: 'Centerline stationing', icon: Milestone },
] as const satisfies ReadonlyArray<{
  key: FigureElementPanelKey
  label: string
  icon: typeof Type
}>

export const ELEMENT_ANCHORS: ReadonlyArray<{
  value: Anchor
  label: string
}> = [
  { value: 'tl', label: 'Top left' },
  { value: 'tc', label: 'Top center' },
  { value: 'tr', label: 'Top right' },
  { value: 'ml', label: 'Middle left' },
  { value: 'mc', label: 'Center' },
  { value: 'mr', label: 'Middle right' },
  { value: 'bl', label: 'Bottom left' },
  { value: 'bc', label: 'Bottom center' },
  { value: 'br', label: 'Bottom right' },
]

export function isElementVisible(
  settings: FigureSettings,
  key: MapElementKey,
) {
  if (key === 'title') return settings.showTitle
  if (key === 'diffLegend') return settings.showLegend
  if (key === 'wetDry') return settings.showWetDryKey
  if (key === 'north') return settings.showNorth
  return settings.showScale
}
