import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../src/application/ports/projectFolderStorage'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'
import type { HydraulicProfileProjectState } from '../src/features/hydraulic-profiles/hydraulicProfileProjectFile'
import {
  createHydraulicProfileProjectFolder,
  hydraulicProjectDirectoryName,
  openHydraulicProfileProjectFolder,
  saveHydraulicProfileProjectFolder,
} from '../src/features/project-lifecycle/hydraulicProfileProjectFolder'

type MemoryDirectory = {
  name: string
  files: Map<string, string>
  children: Map<string, MemoryDirectory>
}

function reference(directory: MemoryDirectory): ProjectDirectoryReference {
  return { name: directory.name, handle: directory }
}

function memoryStorage() {
  const root: MemoryDirectory = { name: 'Projects', files: new Map(), children: new Map() }
  const writes: string[] = []
  const port: ProjectFolderStoragePort = {
    isSupported: () => true,
    pickDirectory: async () => reference(root),
    directoryExists: async (parent, name) =>
      (parent.handle as MemoryDirectory).children.has(name),
    createDirectory: async (parent, name) => {
      const directory: MemoryDirectory = { name, files: new Map(), children: new Map() }
      ;(parent.handle as MemoryDirectory).children.set(name, directory)
      return reference(directory)
    },
    readText: async (directory, path) => {
      const value = (directory.handle as MemoryDirectory).files.get(path)
      if (value == null) throw new Error(`Missing ${path}`)
      return value
    },
    writeText: async (directory, path, contents) => {
      writes.push(path)
      ;(directory.handle as MemoryDirectory).files.set(path, contents)
    },
  }
  return { port, root: reference(root), writes }
}

function profile(): HydraulicProfileProjectState {
  return {
    conditionLabel: 'Existing Conditions',
    summaryText: 'Reach\tStation\tMin\nSite 6\t100\t25',
    profileText: 'Distance\tValue\n0\t25',
    selectedSectionId: 'profile-section-1',
    datasetConfiguration: null,
    settings: createDefaultHydraulicProfileSettings(),
  }
}

describe('folder-backed hydraulic profile projects', () => {
  it('sanitizes project names without losing the engineer-facing title', () => {
    assert.equal(hydraulicProjectDirectoryName(' Site 6: FRA? '), 'Site 6- FRA-')
    assert.throws(() => hydraulicProjectDirectoryName('  ...  '), /project name/)
  })

  it('creates separate inputs and writes the manifest last', async () => {
    const storage = memoryStorage()
    const opened = await createHydraulicProfileProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6: FRA?',
      profile: profile(),
      timestamp: '2026-08-06T08:00:00.000Z',
    })

    assert.equal(opened.directory.name, 'Site 6- FRA-')
    assert.deepEqual(storage.writes, [
      'inputs/profiles/summary-table.txt',
      'inputs/profiles/profile-values.txt',
      'workspaces/hydraulic-profiles.hydfig.json',
      'project.hfg.json',
    ])
    assert.equal(opened.manifest.projectName, 'Site 6: FRA?')
  })

  it('restores the editable input files and saved settings', async () => {
    const storage = memoryStorage()
    const created = await createHydraulicProfileProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6 FRA',
      profile: profile(),
      timestamp: '2026-08-06T08:00:00.000Z',
    })
    await storage.port.writeText(
      created.directory,
      'inputs/profiles/summary-table.txt',
      'Reach\tStation\tMin\nEdited\t200\t30',
    )

    const opened = await openHydraulicProfileProjectFolder({
      storage: storage.port,
      directory: created.directory,
    })

    assert.match(opened.profile.summaryText, /Edited/)
    assert.equal(opened.profile.profileText, profile().profileText)
    assert.equal(opened.profile.settings.title, 'Hydraulic Cross Section')
  })

  it('preserves creation time when an existing project is saved', async () => {
    const storage = memoryStorage()
    const created = await createHydraulicProfileProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6 FRA',
      profile: profile(),
      timestamp: '2026-08-06T08:00:00.000Z',
    })
    const nextProfile = { ...profile(), conditionLabel: 'Proposed Conditions' }
    const manifest = await saveHydraulicProfileProjectFolder({
      storage: storage.port,
      directory: created.directory,
      manifest: created.manifest,
      profile: nextProfile,
      timestamp: '2026-08-06T09:00:00.000Z',
    })

    assert.equal(manifest.createdAt, '2026-08-06T08:00:00.000Z')
    assert.equal(manifest.updatedAt, '2026-08-06T09:00:00.000Z')
    const reopened = await openHydraulicProfileProjectFolder({
      storage: storage.port,
      directory: created.directory,
    })
    assert.equal(reopened.profile.conditionLabel, 'Proposed Conditions')
  })
})
