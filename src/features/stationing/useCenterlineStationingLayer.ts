import { useEffect, useMemo } from 'react'
import {
  extractCenterlineCandidates,
  generateCenterlineStationTicks,
} from '../../core/centerlineStationing'
import type {
  CenterlineDirection,
  CenterlineStationingSettings,
  MapOverlay,
} from '../../core/types'

type Options = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  settings: CenterlineStationingSettings
  centerlineId: string
  direction: CenterlineDirection
  startStation: number
  selectedLabelId?: string | null
  setCenterline(id: string): void
  setSelectedLabelId?(id: string | null): void
}

export function useCenterlineStationingLayer({
  modelWkt,
  overlays,
  settings,
  centerlineId,
  direction,
  startStation,
  selectedLabelId = null,
  setCenterline,
  setSelectedLabelId,
}: Options) {
  const candidates = useMemo(() => {
    if (!modelWkt) return []
    try {
      return extractCenterlineCandidates(overlays, modelWkt)
    } catch {
      return []
    }
  }, [modelWkt, overlays])

  const selectedCenterline =
    candidates.find((candidate) => candidate.id === centerlineId) ?? null

  const ticks = useMemo(() => {
    if (!selectedCenterline) return []
    try {
      return generateCenterlineStationTicks(
        selectedCenterline,
        direction,
        startStation,
        settings,
      )
    } catch {
      return []
    }
  }, [direction, selectedCenterline, settings, startStation])

  const layer = useMemo(
    () => selectedCenterline
      ? {
          centerline: selectedCenterline,
          direction,
          ticks,
          selectedLabelId,
        }
      : undefined,
    [direction, selectedCenterline, selectedLabelId, ticks],
  )

  useEffect(() => {
    if (
      centerlineId &&
      modelWkt &&
      overlays.length > 0 &&
      !candidates.some((candidate) => candidate.id === centerlineId)
    ) {
      setCenterline('')
      return
    }
    if (!centerlineId && candidates.length === 1) {
      setCenterline(candidates[0].id)
    }
  }, [candidates, centerlineId, modelWkt, overlays.length, setCenterline])

  useEffect(() => {
    if (
      selectedLabelId &&
      !ticks.some((tick) => tick.id === selectedLabelId && tick.label)
    ) {
      setSelectedLabelId?.(null)
    }
  }, [selectedLabelId, setSelectedLabelId, ticks])

  return { candidates, selectedCenterline, ticks, layer }
}
