import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HydraulicEngine } from '../src/core/hydraulicEngine'
import type { PlanViewResultScene } from '../src/core/types'
import { createDefaultPlanViewResultSettings } from '../src/features/plan-view-results/planViewResultSettings'
import { createPlanViewWorkspaceOutputController } from '../src/features/plan-view-results/planViewWorkspaceOutputController'
import {
  syntheticGeometry,
  syntheticRunSelection,
} from './fixtures/syntheticHydraulics'

function canvas(width = 1650, height = 1275) {
  return {
    width,
    height,
    toDataURL: () => 'data:image/png;base64,figure',
  } as HTMLCanvasElement
}

function scene(): PlanViewResultScene {
  const projected = syntheticGeometry()
  const selection = syntheticRunSelection(
    'EX',
    'Existing',
    'Existing 100YR',
    projected,
  )
  return {
    condition: selection.condition,
    selection,
    outputKind: 'scalar',
    projected,
    result: {
      paramName: 'Water_Depth_ft',
      label: 'Water Depth',
      units: 'ft',
      defaultRamp: 'depth',
    },
    values: new Float32Array([0.5, 2, 3.5, 5]),
    validMin: 0.5,
    validMax: 5,
    autoMin: 0,
    autoMax: 5,
    autoInterval: 0.5,
    validNodes: 4,
  }
}

function controller(activeScene: PlanViewResultScene | null) {
  let captures = 0
  const draft = {
    workspaceId: 'plan-view-results',
    schemaVersion: 1,
    source: '{"settings":{}}',
  }
  const output = createPlanViewWorkspaceOutputController({
    canvasRef: { current: canvas() },
    scene: activeScene,
    engine: new HydraulicEngine(),
    settings: createDefaultPlanViewResultSettings(),
    overlays: [],
    centerlineStationing: [],
    annotations: [],
    captureDraft: () => {
      captures += 1
      return draft
    },
    appendNotices: () => undefined,
  })
  return { output, draft, captures: () => captures }
}

describe('Plan-View workspace output controller', () => {
  it('requires a generated scene before creating an export artifact', () => {
    const { output, captures } = controller(null)

    assert.equal(output.createExportFigure(), null)
    assert.equal(captures(), 0)
  })

  it('creates an editable report figure from the active canvas and scene', () => {
    const { output, draft, captures } = controller(scene())

    const figure = output.createExportFigure()

    assert.ok(figure)
    assert.equal(figure.title, 'Existing - Water Depth')
    assert.equal(
      figure.caption,
      'Water Depth for Existing 100YR, Existing.',
    )
    assert.equal(figure.widthPx, 1650)
    assert.equal(figure.heightPx, 1275)
    assert.equal(figure.imageDataUrl, 'data:image/png;base64,figure')
    assert.equal(figure.workspaceDraft, draft)
    assert.equal(captures(), 1)
  })
})
