import { useEffect, useMemo } from 'react'
import { extractCenterlineCandidates } from '../../core/centerlineStationing'
import type {
  CenterlineStationingSettings,
  MapOverlay,
} from '../../core/types'
import {
  buildCenterlineStationingLayers,
  type CenterlineStationingSource,
} from './centerlineStationingSource'
import type { CenterlineStationingSourceState } from './useCenterlineStationingSource'

type Options = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  settings: CenterlineStationingSettings
  source: CenterlineStationingSourceState
  selectedLabelId?: string | null
  toggleCenterline(id: string, selected: boolean): void
}

export function useCenterlineStationingLayers({
  modelWkt,
  overlays,
  settings,
  source,
  selectedLabelId = null,
  toggleCenterline,
}: Options) {
  const candidates = useMemo(() => {
    if (!modelWkt) return []
    try {
      return extractCenterlineCandidates(overlays, modelWkt)
    } catch {
      return []
    }
  }, [modelWkt, overlays])

  const stationingSource = useMemo<CenterlineStationingSource>(() => ({
    centerlines: source.centerlines.flatMap((entry) => {
      const centerline = candidates.find(
        (candidate) => candidate.id === entry.centerlineId,
      )
      return centerline ? [{ ...entry, centerline }] : []
    }),
  }), [candidates, source.centerlines])

  const layers = useMemo(
    () => buildCenterlineStationingLayers(
      stationingSource,
      settings,
      selectedLabelId,
    ),
    [selectedLabelId, settings, stationingSource],
  )
  const activeLayer = layers.find(
    (layer) => layer.centerline.id === source.activeCenterlineId,
  )
  const activeCenterline = activeLayer?.centerline ?? null
  const activeEntry = source.centerlines.find(
    (entry) => entry.centerlineId === source.activeCenterlineId,
  ) ?? null

  useEffect(() => {
    const availableIds = new Set(candidates.map((candidate) => candidate.id))
    for (const entry of source.centerlines) {
      if (!availableIds.has(entry.centerlineId)) {
        toggleCenterline(entry.centerlineId, false)
      }
    }
    if (source.centerlines.length === 0 && candidates.length === 1) {
      toggleCenterline(candidates[0].id, true)
    }
  }, [candidates, source.centerlines, toggleCenterline])

  return {
    candidates,
    layers,
    activeLayer,
    activeCenterline,
    activeEntry,
    source: stationingSource,
  }
}
