import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  defineSettingsSections,
  settingsSectionByKey,
} from '../src/features/figures/settingsSectionModule'
import {
  WSE_SETTINGS_SECTIONS,
  wseSettingsSectionByKey,
} from '../src/features/wse-difference/wseSettingsSections'

describe('settings section module registry', () => {
  it('registers the complete WSE settings workflow in display order', () => {
    assert.deepEqual(
      WSE_SETTINGS_SECTIONS.map((section) => section.key),
      [
        'calculation',
        'cartography',
        'frame',
        'elements',
        'stationing',
        'annotations',
        'export',
      ],
    )
    assert.equal(
      wseSettingsSectionByKey('stationing').label,
      'Stationing',
    )
    assert.equal(
      wseSettingsSectionByKey('annotations').label,
      'Callouts',
    )
  })

  it('rejects duplicate section keys', () => {
    const section = WSE_SETTINGS_SECTIONS[0]
    assert.throws(
      () => defineSettingsSections([section, section]),
      /Duplicate settings section key/,
    )
  })

  it('fails loudly for an unregistered section', () => {
    assert.throws(
      () =>
        settingsSectionByKey(
          WSE_SETTINGS_SECTIONS,
          'missing' as (typeof WSE_SETTINGS_SECTIONS)[number]['key'],
        ),
      /Unknown settings section/,
    )
  })
})
