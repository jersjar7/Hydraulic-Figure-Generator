import { useMemo } from 'react'
import { stationWseAssessmentLines } from '../../application/hydraulics/stationWseAssessmentLines'
import type {
  AssessmentMapLayer,
  FigureSettings,
  MapOverlay,
} from '../../core/types'
import type { AssessmentWorkflowState } from '../assessment-lines/useAssessmentWorkflow'
import { useCenterlineStationingLayer } from '../stationing/useCenterlineStationingLayer'
import { useCenterlineStationingLayers } from '../stationing/useCenterlineStationingLayers'
import type { useCenterlineStationingSource } from '../stationing/useCenterlineStationingSource'
import { assessmentWseLabel } from './workspaceInteractions'

type AssessmentMapLayerOptions = {
  modelWkt: string | null | undefined
  overlays: MapOverlay[]
  state: AssessmentWorkflowState
  stationing: FigureSettings['centerlineStationing']
  stationingSource?: ReturnType<typeof useCenterlineStationingSource>
  selectedStationLabelId: string | null
  setCenterline?: (id: string) => void
  setSelectedLabelId?: (id: string | null) => void
}

const EMPTY_STATIONING_SOURCE = {
  activeCenterlineId: '',
  centerlines: [],
}
const ignoreCenterlineChange = () => undefined

export function useAssessmentMapLayers({
  modelWkt,
  overlays,
  state,
  stationing,
  stationingSource,
  selectedStationLabelId,
  setCenterline,
  setSelectedLabelId,
}: AssessmentMapLayerOptions) {
  const legacyStationing = useCenterlineStationingLayer({
    modelWkt,
    overlays,
    settings: stationing,
    centerlineId: state.centerlineId,
    direction: state.direction,
    startStation: state.startStation,
    selectedLabelId: selectedStationLabelId,
    setCenterline: setCenterline ?? ignoreCenterlineChange,
    setSelectedLabelId,
  })
  const centerlineStationing = useCenterlineStationingLayers({
    modelWkt,
    overlays,
    settings: stationing,
    source: stationingSource?.state ?? EMPTY_STATIONING_SOURCE,
    selectedLabelId: selectedStationLabelId,
    toggleCenterline:
      stationingSource?.toggleCenterline ?? ignoreCenterlineChange,
    setSelectedLabelId,
  })
  const multiCenterline = Boolean(stationingSource)
  const selectedCenterline = multiCenterline
    ? centerlineStationing.activeCenterline
    : legacyStationing.selectedCenterline
  const activeEntry = useMemo(
    () => multiCenterline
      ? centerlineStationing.activeEntry
      : selectedCenterline
        ? {
            centerlineId: selectedCenterline.id,
            direction: state.direction,
            startStation: state.startStation,
          }
        : null,
    [
      centerlineStationing.activeEntry,
      multiCenterline,
      selectedCenterline,
      state.direction,
      state.startStation,
    ],
  )
  const centerlineStationTicks = multiCenterline
    ? centerlineStationing.activeLayer?.ticks ?? []
    : legacyStationing.ticks
  const centerlineStationLayers = useMemo(
    () => multiCenterline
      ? centerlineStationing.layers
      : legacyStationing.layer ? [legacyStationing.layer] : [],
    [centerlineStationing.layers, legacyStationing.layer, multiCenterline],
  )

  const stationedAssessmentLines = useMemo(
    () =>
      selectedCenterline && activeEntry
        ? stationWseAssessmentLines({
            lines: state.collection.lines,
            centerline: selectedCenterline,
            direction: activeEntry.direction,
            startStation: activeEntry.startStation,
            overrides: state.overrides,
          })
        : null,
    [
      selectedCenterline,
      activeEntry,
      state.collection.lines,
      state.overrides,
    ],
  )

  const exportLayer = useMemo<AssessmentMapLayer>(() => {
    const exportStationing = centerlineStationLayers.map((layer) => ({
      ...layer,
      selectedLabelId: null,
    }))
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
    centerlineStationLayers,
    stationedAssessmentLines,
    state.collection.lines,
    state.overrides,
  ])

  const displayLayer = useMemo<AssessmentMapLayer>(() => {
    const baseLayer = {
      ...exportLayer,
      selectedCalloutId: state.selectedLineId,
      centerlineStationing: centerlineStationLayers,
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
    centerlineStationLayers,
    state.panelView,
    state.selectedLineId,
    stationedAssessmentLines,
  ])

  return {
    centerlineCandidates: multiCenterline
      ? centerlineStationing.candidates
      : legacyStationing.candidates,
    selectedCenterline,
    centerlineStationTicks,
    centerlineStationLayer: multiCenterline
      ? centerlineStationing.activeLayer
      : legacyStationing.layer,
    centerlineStationLayers,
    activeCenterlineEntry: activeEntry,
    stationedAssessmentLines,
    exportLayer,
    displayLayer,
  }
}
