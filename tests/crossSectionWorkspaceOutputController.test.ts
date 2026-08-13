import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { HydraulicCrossSectionScene } from '../src/core/types'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'
import { createCrossSectionWorkspaceOutputController } from '../src/features/cross-section/crossSectionWorkspaceOutputController'

function canvas() {
  return {
    width: 1600,
    height: 1000,
    toDataURL: () => 'data:image/png;base64,cross-section',
  } as HTMLCanvasElement
}

function scene(): HydraulicCrossSectionScene {
  return {
    line: {
      id: 'section-1000',
      label: 'Section 10+00',
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      direction: 'a-to-b',
    },
  } as HydraulicCrossSectionScene
}

describe('Cross-Section workspace output controller', () => {
  it('requires a generated chart before creating an export artifact', () => {
    const output = createCrossSectionWorkspaceOutputController({
      canvasRef: { current: canvas() },
      scene: null,
      settings: createDefaultCrossSectionSettings(),
      baselineLabel: 'Existing',
      comparisonLabel: 'Proposed',
      captureDraft: () => ({
        workspaceId: 'cross-section-comparison',
        schemaVersion: 1,
        source: '{}',
      }),
    })

    assert.equal(output.createExportFigure(), null)
  })

  it('creates a workspace-owned artifact from the current chart', () => {
    const draft = {
      workspaceId: 'cross-section-comparison',
      schemaVersion: 1,
      source: '{"selectedLine":{}}',
    }
    const output = createCrossSectionWorkspaceOutputController({
      canvasRef: { current: canvas() },
      scene: scene(),
      settings: createDefaultCrossSectionSettings(),
      baselineLabel: 'Existing',
      comparisonLabel: 'Proposed',
      captureDraft: () => draft,
    })

    const figure = output.createExportFigure()

    assert.ok(figure)
    assert.equal(figure.title, 'Cross-Section Comparison - Section 10+00')
    assert.equal(
      figure.caption,
      'Existing and Proposed hydraulic comparison at Section 10+00.',
    )
    assert.equal(figure.imageDataUrl, 'data:image/png;base64,cross-section')
    assert.equal(figure.workspaceDraft, draft)
  })
})
