import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canCompareWse,
  compareWse,
} from '../src/application/hydraulics/compareWse'
import { generateWseAssessmentLines } from '../src/application/hydraulics/generateWseAssessmentLines'
import {
  buildPlanViewResult,
  canBuildPlanViewResult,
} from '../src/application/hydraulics/buildPlanViewResult'
import type { HydraulicAnalysisPort } from '../src/application/ports/hydraulicAnalysis'
import type {
  WseAssessmentLineCollection,
  WseDifferenceScene,
  PlanViewResultScene,
} from '../src/core/types'

function analysisPort(
  scene: WseDifferenceScene,
  assessment: WseAssessmentLineCollection,
): HydraulicAnalysisPort {
  return {
    scalarResultOptions: () => [
      {
        paramName: 'Water_Depth_ft',
        label: 'Water Depth',
        units: 'ft',
        defaultRamp: 'depth',
        shape: [1, 4],
      },
    ],
    buildPlanViewResult: () => ({
      result: { paramName: 'Water_Depth_ft' },
    }) as PlanViewResultScene,
    isReady: (baseline, comparison) => baseline !== comparison,
    buildWseDifference: () => scene,
    buildWseAssessmentLines: () => assessment,
    buildCrossSection: () => {
      throw new Error('Not used by this test.')
    },
  }
}

describe('hydraulic application use cases', () => {
  it('checks readiness and returns a comparable WSE scene', () => {
    const scene = {
      validDifferenceNodes: 4,
    } as WseDifferenceScene
    const port = analysisPort(scene, {
      scenarioKey: 'EX',
      interval: 1,
      levels: [],
      levelCount: 0,
      lines: [],
    })

    assert.equal(
      canCompareWse(port, {
        baselineId: 'EX',
        comparisonId: 'PR',
      }),
      true,
    )
    assert.equal(
      compareWse(port, {
        baselineId: 'EX',
        baselineRun: 0,
        comparisonId: 'PR',
        comparisonRun: 0,
        dryDepth: 0,
      }),
      scene,
    )
  })

  it('rejects a scene without comparable hydraulic nodes', () => {
    const port = analysisPort(
      { validDifferenceNodes: 0 } as WseDifferenceScene,
      {
        scenarioKey: 'EX',
        interval: 1,
        levels: [],
        levelCount: 0,
        lines: [],
      },
    )

    assert.throws(
      () =>
        compareWse(port, {
          baselineId: 'EX',
          baselineRun: 0,
          comparisonId: 'PR',
          comparisonRun: 0,
          dryDepth: 0,
        }),
      /no overlapping valid WSE values/,
    )
  })

  it('delegates assessment-line generation through the analysis port', () => {
    const assessment: WseAssessmentLineCollection = {
      scenarioKey: 'NA',
      interval: 0.5,
      levels: [50],
      levelCount: 1,
      lines: [],
    }
    const port = analysisPort(
      { validDifferenceNodes: 1 } as WseDifferenceScene,
      assessment,
    )

    assert.equal(
      generateWseAssessmentLines(port, {
        scenarioId: 'NA',
        run: 2,
        dryDepth: 0,
        interval: 0.5,
      }),
      assessment,
    )
  })

  it('checks and builds a selected scalar plan-view result', () => {
    const port = analysisPort(
      { validDifferenceNodes: 1 } as WseDifferenceScene,
      {
        scenarioKey: 'EX',
        interval: 1,
        levels: [],
        levelCount: 0,
        lines: [],
      },
    )
    const request = {
      scenarioId: 'EX',
      runIndex: 0,
      resultParameter: 'Water_Depth_ft',
    }

    assert.equal(canBuildPlanViewResult(port, request), true)
    assert.equal(
      buildPlanViewResult(port, request).result.paramName,
      'Water_Depth_ft',
    )
  })
})
