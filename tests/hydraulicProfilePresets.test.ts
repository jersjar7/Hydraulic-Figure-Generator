import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createHydraulicProfilePresetConfiguration,
  matchesHydraulicProfilePreset,
} from '../src/features/hydraulic-profiles/hydraulicProfilePresets'

test('existing and proposed profile presets remain explicit and independently editable', () => {
  const existing = createHydraulicProfilePresetConfiguration('existing')
  const proposed = createHydraulicProfilePresetConfiguration('proposed')

  assert.equal(existing.datasetsPerSection, 4)
  assert.deepEqual(existing.definitions.map(({ name }) => name), [
    'Existing Ground',
    '2-year',
    '100-year',
    '500-year',
  ])
  assert.equal(proposed.datasetsPerSection, 5)
  assert.equal(proposed.definitions[4].name, '2080 100-year')
  assert.equal(proposed.stationReferenceSlot, 0)
  assert.equal(matchesHydraulicProfilePreset(proposed, 'proposed'), true)

  proposed.definitions[0].name = 'Design Ground'
  assert.equal(matchesHydraulicProfilePreset(proposed, 'proposed'), false)
  assert.equal(existing.definitions[0].name, 'Existing Ground')
})
