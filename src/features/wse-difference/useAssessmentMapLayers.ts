import { useEffect, useMemo } from 'react'
import {
  extractCenterlineCandidates,
  generateCenterlineStationTicks,
  stationAssessmentLines,
} from '../../core/centerlineStationing'
import type {
  AssessmentMapLayer,
  FigureSettings,
  MapOverlay,
} from '../../core/types'
import type { AssessmentWorkflowState } from '../assessment-lines/useAssessmentWorkflow'
import { assessmentWseLabel } from './workspaceInteractions'

type AssessmentMapLayerOptions = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  state: AssessmentWorkflowState
  stationing: FigureSettings['centerlineStationing']
  selectedStationLabelId: string | null
  setCenterline: (id: string) => void
}

export function useAssessmentMapLayers({
  modelWkt,
  overlays,
  state,
  stationing,
  selectedStationLabelId,
  setCenterline,
}: AssessmentMapLayerOptions) {
  const centerlineCandidates = useMemo(() => {
    if (!modelWkt) return []
    try {
      return extractCenterlineCandidates(overlays, modelWkt)
    } catch {
      return []
    }
  }, [modelWkt, overlays])

  const selectedCenterline =
    centerlineCandidates.find(
      (candidate) => candidate.id === state.centerlineId,
    ) ?? null

  const centerlineStationTicks = useMemo(() => {
    if (!selectedCenterline) return []
    try {
      return generateCenterlineStationTicks(
        selectedCenterline,
        state.direction,
        state.startStation,
        stationing,
      )
    } catch {
      return []
    }
  }, [
    selectedCenterline,
    state.direction,
    state.startStation,
    stationing,
  ])

  const centerlineStationLayer = useMemo(
    () =>
      selectedCenterline
        ? {
            centerline: selectedCenterline,
            direction: state.direction,
            ticks: centerlineStationTicks,
          }
        : undefined,
    [centerlineStationTicks, selectedCenterline, state.direction],
  )

  const stationedAssessmentLines = useMemo(
    () =>
      selectedCenterline
        ? stationAssessmentLines(
            state.collection.lines,
            selectedCenterline,
            state.direction,
            state.startStation,
            state.overrides,
          )
        : null,
    [
      selectedCenterline,
      state.collection.lines,
      state.direction,
      state.overrides,
      state.startStation,
    ],
  )

  const exportLayer = useMemo<AssessmentMapLayer>(() => {
    if (!stationedAssessmentLines) {
      return {
        lines: state.collection.lines,
        centerlineStationing: centerlineStationLayer,
      }
    }

    const included = stationedAssessmentLines.items.filter(
      (item) => item.status === 'included' && item.selectedIntersection,
    )
    return {
      lines: included.map((item) => item.line),
      centerlineStationing: centerlineStationLayer,
      wseCallouts: included
        .filter((item) => state.overrides[item.line.id]?.labelVisible !== false)
        .map((item) => ({
          lineId: item.line.id,
          text: assessmentWseLabel(item.line.level),
          target: item.selectedIntersection!.mapPoint,
          tangent: item.selectedIntersection!.mapTangent,
          labelPoint: state.overrides[item.line.id]?.labelPoint,
        })),
    }
  }, [
    centerlineStationLayer,
    stationedAssessmentLines,
    state.collection.lines,
    state.overrides,
  ])

  const displayLayer = useMemo<AssessmentMapLayer>(() => {
    const baseLayer = {
      ...exportLayer,
      selectedCalloutId: state.selectedLineId,
      centerlineStationing: exportLayer.centerlineStationing
        ? {
            ...exportLayer.centerlineStationing,
            selectedLabelId: selectedStationLabelId,
          }
        : undefined,
    }
    if (state.panelView !== 'review' || !stationedAssessmentLines) {
      return baseLayer
    }

    const selectedItem =
      stationedAssessmentLines.items.find(
        (item) => item.line.id === state.selectedLineId,
      ) ?? null
    return {
      ...baseLayer,
      selectedLine: selectedItem?.line ?? null,
      endpoints: {
        a: stationedAssessmentLines.centerline.mapPoints[0],
        b: stationedAssessmentLines.centerline.mapPoints.at(-1)!,
      },
      intersections:
        selectedItem?.intersections.map((intersection) => ({
          point: intersection.mapPoint,
          index: intersection.index,
          selected:
            intersection.index === selectedItem.selectedIntersectionIndex,
        })) ?? [],
    }
  }, [
    exportLayer,
    selectedStationLabelId,
    state.panelView,
    state.selectedLineId,
    stationedAssessmentLines,
  ])

  useEffect(() => {
    if (
      state.centerlineId &&
      modelWkt &&
      overlays.length > 0 &&
      !centerlineCandidates.some(
        (candidate) => candidate.id === state.centerlineId,
      )
    ) {
      setCenterline('')
      return
    }
    if (!state.centerlineId && centerlineCandidates.length === 1) {
      setCenterline(centerlineCandidates[0].id)
    }
  }, [
    centerlineCandidates,
    modelWkt,
    overlays.length,
    setCenterline,
    state.centerlineId,
  ])

  return {
    centerlineCandidates,
    selectedCenterline,
    centerlineStationTicks,
    centerlineStationLayer,
    stationedAssessmentLines,
    exportLayer,
    displayLayer,
  }
}
