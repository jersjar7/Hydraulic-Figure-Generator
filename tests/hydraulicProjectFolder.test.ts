import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createReportAssemblyDocument } from '../src/application/report-assembly/reportAssembly'
import type {
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../src/application/ports/projectFolderStorage'
import type { ReportAssemblyDocument } from '../src/core/types'
import { createDefaultHydraulicProfileSettings } from '../src/features/hydraulic-profiles/hydraulicProfileSettings'
import type { HydraulicProfileProjectState } from '../src/features/hydraulic-profiles/hydraulicProfileProjectFile'
import {
  createHydraulicProjectFolder,
  openHydraulicProjectFolder,
  saveHydraulicProjectFolder,
} from '../src/features/project-lifecycle/hydraulicProjectFolder'
import { hydraulicProfileFolderAdapter } from '../src/features/project-lifecycle/hydraulicProfileFolderAdapter'
import { bindProjectWorkspace } from '../src/features/project-lifecycle/projectWorkspaceFolderAdapter'
import { reportAssemblyFolderAdapter } from '../src/features/project-lifecycle/reportAssemblyFolderAdapter'

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
      const child: MemoryDirectory = { name, files: new Map(), children: new Map() }
      ;(parent.handle as MemoryDirectory).children.set(name, child)
      return reference(child)
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

function profile(conditionLabel = 'Existing Conditions'): HydraulicProfileProjectState {
  return {
    conditionLabel,
    summaryText: 'Reach\tStation\tMin\nSite 6\t100\t25',
    profileText: 'Distance\tValue\n0\t25',
    selectedSectionId: 'profile-section-1',
    datasetConfiguration: null,
    settings: createDefaultHydraulicProfileSettings(),
  }
}

function report(title = 'Site 6 Report'): ReportAssemblyDocument {
  return {
    version: 1,
    title,
    groups: [{
      workspaceId: 'hydraulic-profiles-sections',
      workspaceLabel: 'Hydraulic Profiles & Sections',
      figures: [{
        id: 'figure-1',
        workspaceId: 'hydraulic-profiles-sections',
        workspaceLabel: 'Hydraulic Profiles & Sections',
        title: 'Station 1+00',
        caption: 'Existing-condition cross section.',
        imageDataUrl: 'data:image/png;base64,AA==',
        widthPx: 1200,
        heightPx: 900,
        createdAt: '2026-08-06T08:00:00.000Z',
      }],
    }],
  }
}

function bindings({
  profileState = profile(),
  reportState = report(),
  hydrateProfile = () => undefined,
  hydrateReport = () => undefined,
}: {
  profileState?: HydraulicProfileProjectState
  reportState?: ReportAssemblyDocument
  hydrateProfile?: (state: HydraulicProfileProjectState) => void
  hydrateReport?: (state: ReportAssemblyDocument) => void
} = {}) {
  return [
    bindProjectWorkspace({
      adapter: hydraulicProfileFolderAdapter,
      state: profileState,
      hydrate: hydrateProfile,
      createInitialState: () => profile(),
    }),
    bindProjectWorkspace({
      adapter: reportAssemblyFolderAdapter,
      state: reportState,
      hydrate: hydrateReport,
      createInitialState: createReportAssemblyDocument,
    }),
  ]
}

describe('multi-workspace hydraulic project folders', () => {
  it('writes every registered workspace before the manifest', async () => {
    const storage = memoryStorage()
    const opened = await createHydraulicProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6 FRA',
      workspaces: bindings(),
      activeWorkspaceId: 'report-assembly',
      timestamp: '2026-08-06T08:00:00.000Z',
    })

    assert.deepEqual(storage.writes, [
      'inputs/profiles/summary-table.txt',
      'inputs/profiles/profile-values.txt',
      'workspaces/hydraulic-profiles.hydfig.json',
      'workspaces/export-collection.hydreport.json',
      'project.hfg.json',
    ])
    assert.equal(opened.manifest.activeWorkspaceId, 'report-assembly')
    assert.deepEqual(Object.keys(opened.manifest.workspaces), [
      'hydraulic-profiles-sections',
      'report-assembly',
    ])
  })

  it('restores profile inputs and the Export Collection together', async () => {
    const storage = memoryStorage()
    const created = await createHydraulicProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6 FRA',
      workspaces: bindings(),
      activeWorkspaceId: 'hydraulic-profiles-sections',
      timestamp: '2026-08-06T08:00:00.000Z',
    })
    let loadedProfile: HydraulicProfileProjectState | null = null
    let loadedReport: ReportAssemblyDocument | null = null
    const opened = await openHydraulicProjectFolder({
      storage: storage.port,
      directory: created.directory,
      workspaces: bindings({
        profileState: profile('Temporary Conditions'),
        reportState: report('Temporary Report'),
        hydrateProfile: (state) => { loadedProfile = state },
        hydrateReport: (state) => { loadedReport = state },
      }),
    })
    opened.hydrations.forEach((item) => item.apply())

    assert.equal(loadedProfile?.conditionLabel, 'Existing Conditions')
    assert.equal(loadedReport?.title, 'Site 6 Report')
    assert.equal(loadedReport?.groups[0].figures[0].caption, 'Existing-condition cross section.')
  })

  it('preserves unknown manifest workspaces while saving known workspaces', async () => {
    const storage = memoryStorage()
    const created = await createHydraulicProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Site 6 FRA',
      workspaces: bindings(),
      activeWorkspaceId: 'hydraulic-profiles-sections',
      timestamp: '2026-08-06T08:00:00.000Z',
    })
    created.manifest.workspaces['future-workspace'] = {
      documentPath: 'workspaces/future.json',
      inputPaths: {},
    }
    const manifest = await saveHydraulicProjectFolder({
      storage: storage.port,
      directory: created.directory,
      manifest: created.manifest,
      workspaces: bindings({ reportState: report('Updated Report') }),
      activeWorkspaceId: 'report-assembly',
      timestamp: '2026-08-06T09:00:00.000Z',
    })

    assert.equal(manifest.workspaces['future-workspace'].documentPath, 'workspaces/future.json')
    assert.equal(manifest.activeWorkspaceId, 'report-assembly')
  })

  it('resets newly registered workspaces when opening an older project', async () => {
    const storage = memoryStorage()
    const created = await createHydraulicProjectFolder({
      storage: storage.port,
      parent: storage.root,
      projectName: 'Legacy Profile Project',
      workspaces: bindings().slice(0, 1),
      activeWorkspaceId: 'hydraulic-profiles-sections',
      timestamp: '2026-08-06T08:00:00.000Z',
    })
    let loadedReport: ReportAssemblyDocument | null = null
    const opened = await openHydraulicProjectFolder({
      storage: storage.port,
      directory: created.directory,
      workspaces: bindings({
        reportState: report('Unsaved Report'),
        hydrateReport: (state) => { loadedReport = state },
      }),
    })
    opened.hydrations.forEach((item) => item.apply())

    assert.equal(loadedReport?.title, 'Hydraulic Figure Report')
    assert.deepEqual(loadedReport?.groups, [])
  })
})
