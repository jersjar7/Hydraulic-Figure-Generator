import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reconcileScenarioRoles } from '../src/features/project-session/useProjectSession'

describe('project session scenario roles', () => {
  it('preserves valid named scenario assignments', () => {
    assert.deepEqual(
      reconcileScenarioRoles(['NA', 'EX', 'PR'], {
        baselineId: 'NA',
        comparisonId: 'PR',
        assessmentId: 'EX',
      }),
      {
        baselineId: 'NA',
        comparisonId: 'PR',
        assessmentId: 'EX',
      },
    )
  })

  it('falls back to Existing and a distinct comparison scenario', () => {
    assert.deepEqual(
      reconcileScenarioRoles(['EX', 'NA'], {
        baselineId: 'missing',
        comparisonId: 'missing',
        assessmentId: 'missing',
      }),
      {
        baselineId: 'EX',
        comparisonId: 'NA',
        assessmentId: 'EX',
      },
    )
  })

  it('supports one arbitrary scenario without inventing another role', () => {
    assert.deepEqual(
      reconcileScenarioRoles(['ALT'], {
        baselineId: 'EX',
        comparisonId: 'PR',
        assessmentId: 'EX',
      }),
      {
        baselineId: 'ALT',
        comparisonId: 'ALT',
        assessmentId: 'ALT',
      },
    )
  })
})
