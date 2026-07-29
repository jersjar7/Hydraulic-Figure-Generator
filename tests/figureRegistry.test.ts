import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_FIGURE_MODULE,
  FIGURE_MODULES,
  figureModuleById,
} from '../src/features/figures/registry'
import {
  WSE_DIFFERENCE_FIGURE_ID,
  wseDifferenceFigure,
} from '../src/features/wse-difference/wseDifferenceFigure'

describe('figure module registry', () => {
  it('registers WSE Difference as the default figure workflow', () => {
    assert.equal(DEFAULT_FIGURE_MODULE, wseDifferenceFigure)
    assert.deepEqual(
      FIGURE_MODULES.map((figure) => figure.id),
      [WSE_DIFFERENCE_FIGURE_ID],
    )
    assert.equal(
      figureModuleById(WSE_DIFFERENCE_FIGURE_ID),
      wseDifferenceFigure,
    )
    assert.equal(figureModuleById('not-registered'), null)
  })

  it('owns the accepted defaults and export naming', () => {
    const settings = wseDifferenceFigure.createDefaultSettings()

    assert.equal(settings.dryDepth, 0)
    assert.equal(settings.orientation, 'landscape')
    assert.equal(wseDifferenceFigure.label, 'WSE Difference')
    assert.deepEqual(
      wseDifferenceFigure.editor.requiredScenarioRoles,
      ['baseline', 'comparison'],
    )
    assert.equal(wseDifferenceFigure.editor.shapefileOverlays, true)
    assert.equal(wseDifferenceFigure.editor.assessmentLines, true)
    assert.equal(wseDifferenceFigure.editor.centerlineStationing, true)
    assert.equal(wseDifferenceFigure.editor.annotations, true)
    assert.deepEqual(
      wseDifferenceFigure.editor.settingsSections.map(
        (section) => section.key,
      ),
      [
        'calculation',
        'legend',
        'frame',
        'elements',
        'annotations',
        'export',
      ],
    )
  })
})
