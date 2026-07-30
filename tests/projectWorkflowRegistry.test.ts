import assert from 'node:assert/strict'
import { Database } from 'lucide-react'
import { describe, it } from 'node:test'
import {
  defineProjectWorkflowModules,
  findProjectWorkflowModule,
  type ProjectWorkflowModule,
} from '../src/components/project-data/projectWorkflowModule'
import { PROJECT_WORKFLOW_MODULES } from '../src/components/project-data/projectWorkflowRegistry'

describe('project workflow registry', () => {
  it('registers the complete project workflow in navigation order', () => {
    assert.deepEqual(
      PROJECT_WORKFLOW_MODULES.map((module) => module.key),
      ['models', 'layers', 'assessment', 'review'],
    )
    assert.equal(
      findProjectWorkflowModule(PROJECT_WORKFLOW_MODULES, 'layers').label,
      'Layers',
    )
  })

  it('rejects duplicate project workflow keys', () => {
    const module: ProjectWorkflowModule<null> = {
      key: 'models',
      label: 'Models',
      title: 'Models',
      icon: Database,
      status: () => ({}),
      render: () => null,
    }

    assert.throws(
      () => defineProjectWorkflowModules([module, module]),
      /Duplicate project workflow key/,
    )
  })
})
