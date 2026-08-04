import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_FIGURE_MODULE,
  FIGURE_MODULES,
  figureModuleById,
} from '../src/features/figures/workspaceRegistry'
import {
  CROSS_SECTION_FIGURE_ID,
  HYDRAULIC_PROFILES_FIGURE_ID,
  PLAN_VIEW_RESULTS_FIGURE_ID,
  WSE_DIFFERENCE_FIGURE_ID,
} from '../src/core/figureIds'
import { wseDifferenceFigure } from '../src/features/wse-difference/wseDifferenceFigure'
import { crossSectionFigure } from '../src/features/cross-section/crossSectionFigure'
import { planViewResultFigure } from '../src/features/plan-view-results/planViewResultFigure'
import { hydraulicProfileFigure } from '../src/features/hydraulic-profiles/hydraulicProfileFigure'

describe('figure module registry', () => {
  it('registers WSE Difference as the default figure workflow', () => {
    assert.equal(DEFAULT_FIGURE_MODULE, wseDifferenceFigure)
    assert.deepEqual(
      FIGURE_MODULES.map((figure) => figure.id),
      [
        WSE_DIFFERENCE_FIGURE_ID,
        CROSS_SECTION_FIGURE_ID,
        PLAN_VIEW_RESULTS_FIGURE_ID,
        HYDRAULIC_PROFILES_FIGURE_ID,
      ],
    )
    assert.equal(
      figureModuleById(CROSS_SECTION_FIGURE_ID),
      crossSectionFigure,
    )
    assert.equal(
      figureModuleById(WSE_DIFFERENCE_FIGURE_ID),
      wseDifferenceFigure,
    )
    assert.equal(
      figureModuleById(PLAN_VIEW_RESULTS_FIGURE_ID),
      planViewResultFigure,
    )
    assert.equal(
      figureModuleById(HYDRAULIC_PROFILES_FIGURE_ID),
      hydraulicProfileFigure,
    )
    assert.equal(planViewResultFigure.editor.centerlineStationing, true)
    assert.deepEqual(
      planViewResultFigure.editor.settingsSections.map(
        (section) => section.key,
      ),
      ['result', 'legend', 'frame', 'elements', 'stationing', 'export'],
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
    assert.deepEqual(wseDifferenceFigure.editor.inputs, [
      'hydraulic-models',
      'map-overlays',
      'assessment-lines',
    ])
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
        'stationing',
        'annotations',
        'export',
      ],
    )
  })
})
