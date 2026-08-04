export type Anchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br'

export type ElementPosition = {
  anchor: Anchor
  offX: number
  offY: number
}

export type MapElementKey = 'title' | 'diffLegend' | 'north' | 'scale' | 'wetDry'

export type FigureElementPanelKey = MapElementKey

export type MapElementPositions = Record<MapElementKey, ElementPosition>

export type ElementBoxStyle = {
  background: boolean
  backgroundColor: string
  backgroundOpacity: number
  borderColor: string
  borderWidth: number
}

export type TitleElementStyle = ElementBoxStyle & {
  fontSize: number
  fontWeight: 400 | 600 | 700
  textColor: string
  alignment: 'left' | 'center' | 'right'
  maxWidth: number
}

export type DifferenceLegendElementStyle = ElementBoxStyle & {
  title: string
  units: string
  orientation: 'vertical' | 'horizontal'
  fontSize: number
  decimalPlaces: number
  swatchSize: number
  textColor: string
}

export type WetDryElementStyle = ElementBoxStyle & {
  title: string
  wetLabel: string
  dryLabel: string
  orientation: 'vertical' | 'horizontal'
  fontSize: number
  swatchSize: number
  textColor: string
}

export type NorthElementStyle = ElementBoxStyle & {
  style: 'classic' | 'simple' | 'compass'
  size: number
  color: string
  showLabel: boolean
  rotationMode: 'true-north' | 'page-up'
}

export type ScaleElementStyle = ElementBoxStyle & {
  lengthMode: 'auto' | 'manual'
  manualLength: number
  units: 'us-survey-ft' | 'ft' | 'mi' | 'm'
  divisions: number
  style: 'alternating' | 'ticks'
  decimalPlaces: number
  fontSize: number
  lineColor: string
  fillColor: string
  textColor: string
}

export type MapElementStyles = {
  title: TitleElementStyle
  diffLegend: DifferenceLegendElementStyle
  wetDry: WetDryElementStyle
  north: NorthElementStyle
  scale: ScaleElementStyle
}

export type MapElementBounds = {
  key: MapElementKey
  x: number
  y: number
  width: number
  height: number
}
