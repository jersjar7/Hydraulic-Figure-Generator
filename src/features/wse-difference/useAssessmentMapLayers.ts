import { useMemo } from 'react'
import { stationWseAssessmentLines } from '../../application/hydraulics/stationWseAssessmentLines'
import type {
  AssessmentMapLayer,
  FigureSettings,
  MapOverlay,
} from '../../core/types'
import type { AssessmentWorkflowState } from '../assessment-lines/useAssessmentWorkflow'
import { useCenterlineStationingLayer } from '../stationing/useCenterlineStationingLayer'
import { assessmentWseLabel } from './workspaceInteractions'

type AssessmentMapLayerOptions = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  state: AssessmentWorkflowState
  stationing: FigureSettings['centerlineStationing']
  selectedStationLabelId: string | null
  setCenterline: (id: string) => void
  setSelectedLabelId?: (id: string | null) => void
}

export function useAssessmentMapLayers({
  modelWkt,
  overlays,
  state,
  stationing,
  selectedStationLabelId,
  setCenterline,
  setSelectedLabelId,
}: AssessmentMapLayerOptions) {
  const {
    candidates: centerlineCandidates,
    selectedCenterline,
    ticks: centerlineStationTicks,
    layer: centerlineStationLayer,
  } = useCenterlineStationingLayer({
    modelWkt,
    overlays,
    settings: stationing,
    centerlineId: state.centerlineId,
    direction: state.direction,
    startStation: state.startStation,
    selectedLabelId: selectedStationLabelId,
    setCenterline,
    setSelectedLabelId,
  })

  const stationedAssessmentLines = useMemo(
    () =>
      selectedCenterline
        ? stationWseAssessmentLines({
            lines: state.collection.lines,
            centerline: selectedCenterline,
            direction: state.direction,
            startStation: state.startStation,
            overrides: state.overrides,
          })
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
    const exportStationing = centerlineStationLayer
      ? { ...centerlineStationLayer, selectedLabelId: null }
      : undefined
    if (!stationedAssessmentLines) {
      return {
        lines: state.collection.lines,
        centerlineStationing: exportStationing,
      }
    }

    const included = stationedAssessmentLines.items.filter(
      (item) => item.status === 'included' && item.selectedIntersection,
    )
    return {
      lines: included.map((item) => item.line),
      centerlineStationing: exportStationing,
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
      centerlineStationing: centerlineStationLayer,
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
    centerlineStationLayer,
    state.panelView,
    state.selectedLineId,
    stationedAssessmentLines,
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
