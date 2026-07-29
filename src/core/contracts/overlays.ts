export type OverlayStyle = {
  color: string
  width: number
  visible: boolean
}

export type GeoJsonGeometry = {
  type: string
  coordinates?: unknown
  geometries?: GeoJsonGeometry[]
}

export type GeoJsonFeature = {
  type: 'Feature'
  properties?: Record<string, unknown> | null
  geometry: GeoJsonGeometry | null
}

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
  fileName?: string
}

export type MapOverlay = OverlayStyle & {
  id: string
  name: string
  geojson: GeoJsonFeatureCollection
}

