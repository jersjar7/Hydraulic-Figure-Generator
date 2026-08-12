import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { HydraulicEngine } from '../src/core/hydraulicEngine'
import { createWseWorkspaceOutputController } from '../src/features/wse-difference/wseWorkspaceOutputController'
import { syntheticWseDifferenceScene } from './fixtures/syntheticHydraulics'

function canvas(width = 1650, height = 1275) {
  return {
    width,
    height,
    toDataURL: () => 'data:image/png;base64,figure',
  } as HTMLCanvasElement
}

describe('WSE workspace output controller', () => {
  it('requires a generated scene before creating an export artifact', () => {
    const controller = createWseWorkspaceOutputController({
      canvasRef: { current: canvas() },
      scene: null,
      engine: new HydraulicEngine(),
      settings: createDefaultFigureSettings(),
      overlays: [],
      assessment: { lines: [] },
      annotations: [],
      captureDraft: () => ({
        workspaceId: 'wse-difference',
        schemaVersion: 1,
        source: '{}',
      }),
      setBusy: () => undefined,
      appendNotices: () => undefined,
    })

    assert.equal(controller.createExportFigure(), null)
  })

  it('creates an editable report figure from the current canvas and scene', () => {
    let captures = 0
    const draft = {
      workspaceId: 'wse-difference',
      schemaVersion: 1,
      source: '{"settings":{}}',
    }
    const controller = createWseWorkspaceOutputController({
      canvasRef: { current: canvas() },
      scene: syntheticWseDifferenceScene(),
      engine: new HydraulicEngine(),
      settings: createDefaultFigureSettings(),
      overlays: [],
      assessment: { lines: [] },
      annotations: [],
      captureDraft: () => {
        captures += 1
        return draft
      },
      setBusy: () => undefined,
      appendNotices: () => undefined,
    })

    const figure = controller.createExportFigure()

    assert.ok(figure)
    assert.equal(figure.title, 'WSE Difference - Existing vs Proposed')
    assert.equal(
      figure.caption,
      'WSE Difference - Existing vs Proposed, Proposed 100YR minus Existing 100YR.',
    )
    assert.equal(figure.widthPx, 1650)
    assert.equal(figure.heightPx, 1275)
    assert.equal(figure.imageDataUrl, 'data:image/png;base64,figure')
    assert.equal(figure.workspaceDraft, draft)
    assert.equal(captures, 1)
  })
})
