import type {
  ConditionData,
  ConditionKey,
  IngestNotice,
  RunSelection,
} from './types'
import { conditionNodeCountsMatch } from './hydraulics/conditionCompatibility'
import { projectGeometry } from './hydraulics/geometryProjection'
import {
  getH5Runtime,
  type H5File,
  type H5Runtime,
} from './hydraulics/h5Runtime'
import { inferScenarioDescriptor } from './hydraulics/scenarioDetection'
import { buildWseAssessmentLineCollection } from './hydraulics/wseAssessmentBuilder'
import {
  finalTimestep,
  finalVectorTimestep,
  isDatasetsFile,
  isGeometryFile,
  readDatasets,
  readGeometry,
} from './hydraulics/smsH5Reader'
import { buildHydraulicCrossSectionScene } from './hydraulics/crossSectionBuilder'
import type { CrossSectionLine } from './types'
import {
  buildWseDifferenceScene,
  findResultParam,
} from './hydraulics/wseDifferenceBuilder'

export { conditionNodeCountsMatch } from './hydraulics/conditionCompatibility'
export {
  inferScenarioDescriptor,
  type ScenarioDescriptor,
} from './hydraulics/scenarioDetection'
export {
  findWseDifferenceExtrema,
  formatWseExtremumLabel,
  type WseDifferenceExtrema,
  type WseDifferenceExtremum,
} from './hydraulics/wseExtrema'
export { runDisplayName } from './hydraulics/runDisplayName'

type ValueCacheEntry = Float32Array | { vx: Float32Array; vy: Float32Array }

export class HydraulicEngine {
  private readonly conditions = new Map<ConditionKey, ConditionData>()

  private readonly valueCache = new Map<string, ValueCacheEntry>()

  private fileSequence = 0

  private h5Runtime: H5Runtime | null = null

  private unlinkFile(path: string | undefined) {
    if (!path || !this.h5Runtime) return
    try {
      this.h5Runtime.FS.unlink(path)
    } catch {
      // The in-memory file may already have been released.
    }
  }

  private releaseDataset(condition: ConditionData) {
    const file = condition.datasetFile as H5File | undefined
    try {
      file?.close()
    } catch {
      // Continue releasing the WASM path even if HDF5 reports a close error.
    }
    this.unlinkFile(condition.datasetFilePath)
    condition.datasetFile = undefined
    condition.datasetFilePath = undefined
    condition.datasetFileName = undefined
    condition.datasets = undefined
  }

  async ingest(files: File[]) {
    const wasm = await getH5Runtime()
    this.h5Runtime = wasm
    const notices: IngestNotice[] = []

    for (const file of files) {
      let path: string | undefined
      let h5File: H5File | undefined
      let keepFileOpen = false
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        this.fileSequence += 1
        path = `hydraulic_${this.fileSequence}_${file.name.replace(/[^\w.]/g, '_')}`
        try {
          wasm.FS.unlink(path)
        } catch {
          // A new in-memory path normally has nothing to remove.
        }
        wasm.FS.writeFile(path, bytes)
        h5File = new wasm.File(path, 'r')

        if (isGeometryFile(h5File)) {
          const geometry = readGeometry(h5File)
          const descriptor = inferScenarioDescriptor(
            geometry.meshName,
            file.name,
          )
          if (!descriptor) {
            throw new Error(
              'Geometry was found, but its scenario could not be identified. Include a shared scenario name in the geometry and datasets filenames.',
            )
          }
          const condition = this.getCondition(descriptor.key, descriptor)
          condition.geometryFileName = file.name
          condition.geometry = geometry
          condition.projected = projectGeometry(geometry)
          notices.push({
            level: 'success',
            text: `${condition.label} geometry: ${geometry.N.toLocaleString()} nodes`,
          })
        } else if (isDatasetsFile(h5File)) {
          const datasets = readDatasets(h5File)
          const descriptor = inferScenarioDescriptor(
            datasets.runs[0]?.name ?? '',
            file.name,
          )
          if (!descriptor) {
            throw new Error(
              'Datasets were found, but their scenario could not be identified. Include a shared scenario name in the geometry and datasets filenames.',
            )
          }
          const condition = this.getCondition(descriptor.key, descriptor)
          this.releaseDataset(condition)
          condition.datasetFileName = file.name
          condition.datasetFile = h5File
          condition.datasetFilePath = path
          condition.datasets = datasets
          keepFileOpen = true
          notices.push({
            level: 'success',
            text: `${condition.label} datasets: ${datasets.runs.length} run${datasets.runs.length === 1 ? '' : 's'}`,
          })
        } else {
          notices.push({
            level: 'warning',
            text: `${file.name} is not an SMS geometry or datasets H5 file.`,
          })
        }
      } catch (error) {
        notices.push({
          level: 'error',
          text: `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
        })
      } finally {
        if (!keepFileOpen) {
          try {
            h5File?.close()
          } catch {
            // Invalid files still need their WASM path released.
          }
          this.unlinkFile(path)
        }
      }
    }

    for (const condition of this.conditions.values()) {
      if (
        condition.geometry &&
        condition.datasets &&
        !conditionNodeCountsMatch(condition)
      ) {
        notices.push({
          level: 'error',
          text: `${condition.label} geometry and datasets have different node counts. Replace the mismatched input before generating.`,
        })
      }
    }

    this.valueCache.clear()
    return notices
  }

  reset() {
    for (const condition of this.conditions.values()) {
      this.releaseDataset(condition)
    }
    this.conditions.clear()
    this.valueCache.clear()
  }

  removeCondition(key: ConditionKey) {
    const condition = this.conditions.get(key)
    if (condition) this.releaseDataset(condition)
    this.conditions.delete(key)
    this.valueCache.clear()
  }

  getCondition(
    key: ConditionKey,
    descriptor?: Pick<ConditionData, 'label' | 'kind'>,
  ) {
    const existing = this.conditions.get(key)
    if (existing) return existing
    const condition: ConditionData = {
      key,
      label: descriptor?.label ?? key,
      kind: descriptor?.kind ?? 'other',
    }
    this.conditions.set(key, condition)
    return condition
  }

  scenarios() {
    const order: Record<string, number> = { EX: 0, PR: 1, NA: 2 }
    return [...this.conditions.values()].sort(
      (first, second) =>
        (order[first.key] ?? 10) - (order[second.key] ?? 10) ||
        first.label.localeCompare(second.label),
    )
  }

  renameCondition(key: ConditionKey, label: string) {
    const condition = this.conditions.get(key)
    const nextLabel = label.trim()
    if (condition && nextLabel) condition.label = nextLabel
  }

  condition(key: ConditionKey) {
    return this.conditions.get(key)
  }

  runOptions(key: ConditionKey) {
    const condition = this.conditions.get(key)
    if (
      !condition?.projected ||
      !condition.datasets ||
      !conditionNodeCountsMatch(condition)
    ) {
      return []
    }
    return condition.datasets.runs.map((run, index) => ({
      key,
      condition,
      run,
      index,
    }))
  }

  isReady(baselineKey: ConditionKey, comparisonKey: ConditionKey) {
    return (
      baselineKey !== comparisonKey &&
      this.runOptions(baselineKey).length > 0 &&
      this.runOptions(comparisonKey).length > 0
    )
  }

  commonBounds(keys: Iterable<ConditionKey> = this.conditions.keys()) {
    let x0 = Number.POSITIVE_INFINITY
    let x1 = Number.NEGATIVE_INFINITY
    let y0 = Number.POSITIVE_INFINITY
    let y1 = Number.NEGATIVE_INFINITY

    for (const key of keys) {
      const bbox = this.conditions.get(key)?.projected?.bbox
      if (!bbox) continue
      x0 = Math.min(x0, bbox.x0)
      x1 = Math.max(x1, bbox.x1)
      y0 = Math.min(y0, bbox.y0)
      y1 = Math.max(y1, bbox.y1)
    }

    if (!Number.isFinite(x0)) return { x0: -1, x1: 1, y0: -1, y1: 1 }
    const padX = (x1 - x0) * 0.08
    const padY = (y1 - y0) * 0.08
    return {
      x0: x0 - padX,
      x1: x1 + padX,
      y0: y0 - padY,
      y1: y1 + padY,
    }
  }

  buildWseDifference(
    baselineKey: ConditionKey,
    baselineIndex: number,
    comparisonKey: ConditionKey,
    comparisonIndex: number,
    dryDepth: number,
  ) {
    const existing = this.runOptions(baselineKey)[baselineIndex]
    const proposed = this.runOptions(comparisonKey)[comparisonIndex]
    if (!existing || !proposed) {
      throw new Error('Select one complete Baseline run and one complete Comparison run.')
    }
    if (baselineKey === comparisonKey) {
      throw new Error('Baseline and Comparison must use different scenarios.')
    }

    const existingWseParam = findResultParam(existing.run, /Water_?Elev|WSE/i)
    const proposedWseParam = findResultParam(proposed.run, /Water_?Elev|WSE/i)
    const existingDepthParam = findResultParam(existing.run, /Water_?Depth/i)
    const proposedDepthParam = findResultParam(proposed.run, /Water_?Depth/i)
    if (
      !existingWseParam ||
      !proposedWseParam ||
      !existingDepthParam ||
      !proposedDepthParam
    ) {
      throw new Error(
        'Both selected runs need Water_Elev_ft and Water_Depth_ft datasets.',
      )
    }

    const existingWse = this.scalarValues(existing, existingWseParam)
    const proposedWse = this.scalarValues(proposed, proposedWseParam)
    const existingDepth = this.scalarValues(existing, existingDepthParam)
    const proposedDepth = this.scalarValues(proposed, proposedDepthParam)
    return buildWseDifferenceScene({
      existing,
      proposed,
      existingWse,
      proposedWse,
      existingDepth,
      proposedDepth,
      dryDepth,
    })
  }

  buildWseAssessmentLines(
    scenarioKey: ConditionKey,
    runIndex: number,
    dryDepth: number,
    interval: number,
  ) {
    const selection = this.runOptions(scenarioKey)[runIndex]
    const scenario = this.condition(scenarioKey)
    if (!selection || !scenario) {
      throw new Error('Select a complete assessment-source run before generating assessment lines.')
    }
    const wseParam = findResultParam(selection.run, /Water_?Elev|WSE/i)
    const depthParam = findResultParam(selection.run, /Water_?Depth/i)
    if (!wseParam || !depthParam) {
      throw new Error(
        `The selected ${scenario.label} run needs Water_Elev_ft and Water_Depth_ft datasets.`,
      )
    }
    return buildWseAssessmentLineCollection({
      scenarioKey,
      selection,
      wse: this.scalarValues(selection, wseParam),
      depth: this.scalarValues(selection, depthParam),
      dryDepth,
      interval,
    })
  }

  buildCrossSection(
    baselineKey: ConditionKey,
    baselineIndex: number,
    comparisonKey: ConditionKey,
    comparisonIndex: number,
    line: CrossSectionLine,
    dryDepth: number,
    sampleSpacing = 1,
  ) {
    const baseline = this.runOptions(baselineKey)[baselineIndex]
    const comparison = this.runOptions(comparisonKey)[comparisonIndex]
    if (!baseline || !comparison) {
      throw new Error('Select one complete Baseline run and one complete Comparison run.')
    }
    if (baselineKey === comparisonKey) {
      throw new Error('Baseline and Comparison must use different scenarios.')
    }
    const results = (selection: RunSelection) => {
      const wseParam = findResultParam(selection.run, /Water_?Elev|WSE/i)
      const depthParam = findResultParam(selection.run, /Water_?Depth/i)
      const velocityParam = findResultParam(
        selection.run,
        /^Velocity(?:_ft_p_s)?$|Velocity_ft_p_s/i,
      )
      if (!wseParam || !depthParam) {
        throw new Error(
          `${selection.condition.label} needs Water_Elev_ft and Water_Depth_ft datasets.`,
        )
      }
      return {
        ground: selection.condition.projected!.z,
        wse: this.scalarValues(selection, wseParam),
        depth: this.scalarValues(selection, depthParam),
        velocity: velocityParam
          ? this.vectorValues(selection, velocityParam)
          : undefined,
      }
    }
    return buildHydraulicCrossSectionScene({
      baseline,
      comparison,
      line,
      baselineResults: results(baseline),
      comparisonResults: results(comparison),
      dryDepth,
      sampleSpacing,
    })
  }

  private scalarValues(selection: RunSelection, paramName: string) {
    const cacheKey = `${selection.key}:${selection.index}:${paramName}`
    const cached = this.valueCache.get(cacheKey)
    if (cached instanceof Float32Array) return cached
    const file = selection.condition.datasetFile as H5File | undefined
    if (!file) throw new Error('The selected datasets file is unavailable.')
    const values = finalTimestep(file, selection.run.name, paramName)
    this.valueCache.set(cacheKey, values)
    return values
  }

  private vectorValues(selection: RunSelection, paramName: string) {
    const cacheKey = `${selection.key}:${selection.index}:${paramName}:vector`
    const cached = this.valueCache.get(cacheKey)
    if (cached && !(cached instanceof Float32Array)) return cached
    const file = selection.condition.datasetFile as H5File | undefined
    if (!file) throw new Error('The selected datasets file is unavailable.')
    const values = finalVectorTimestep(file, selection.run.name, paramName)
    this.valueCache.set(cacheKey, values)
    return values
  }
}
