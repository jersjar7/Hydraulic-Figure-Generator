import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addReportFigure,
  createReportAssemblyDocument,
  createReportFigure,
  flattenReportFigures,
  moveReportFigure,
  moveReportWorkspace,
  removeReportFigure,
  updateReportFigure,
} from '../src/application/report-assembly/reportAssembly'
import {
  parseReportAssembly,
  serializeReportAssembly,
} from '../src/features/report-assembly/reportAssemblyProjectFile'

function figure(id: string, workspaceId: string, workspaceLabel: string) {
  return createReportFigure({
    workspaceId,
    workspaceLabel,
    title: id,
    caption: `${id} caption`,
    imageDataUrl: 'data:image/png;base64,AA==',
    widthPx: 1200,
    heightPx: 900,
    workspaceDraft: {
      workspaceId,
      schemaVersion: 1,
      source: JSON.stringify({ title: id }),
    },
  }, id, '2026-08-05T12:00:00.000Z')
}

describe('cross-workspace report assembly', () => {
  it('groups snapshots by workspace and preserves report order', () => {
    let document = createReportAssemblyDocument()
    document = addReportFigure(document, figure('profile-1', 'profiles', 'Profiles'))
    document = addReportFigure(document, figure('map-1', 'maps', 'Maps'))
    document = addReportFigure(document, figure('profile-2', 'profiles', 'Profiles'))
    assert.deepEqual(document.groups.map((group) => group.workspaceId), ['profiles', 'maps'])
    assert.deepEqual(document.groups[0].figures.map((item) => item.id), ['profile-1', 'profile-2'])
    assert.deepEqual(flattenReportFigures(document).map((item) => item.id), ['profile-1', 'profile-2', 'map-1'])
  })

  it('reorders only inside a workspace and reorders workspace bands independently', () => {
    let document = createReportAssemblyDocument()
    for (const item of [
      figure('profile-1', 'profiles', 'Profiles'),
      figure('profile-2', 'profiles', 'Profiles'),
      figure('map-1', 'maps', 'Maps'),
    ]) document = addReportFigure(document, item)
    document = moveReportFigure(document, 'profiles', 'profile-2', 'profile-1')
    assert.deepEqual(document.groups[0].figures.map((item) => item.id), ['profile-2', 'profile-1'])
    document = moveReportFigure(document, 'maps', 'profile-1', 'map-1')
    assert.deepEqual(document.groups[1].figures.map((item) => item.id), ['map-1'])
    document = moveReportWorkspace(document, 'maps', 'profiles')
    assert.deepEqual(document.groups.map((group) => group.workspaceId), ['maps', 'profiles'])
  })

  it('updates metadata, removes empty groups, and round-trips the collection file', () => {
    let document = addReportFigure(
      createReportAssemblyDocument(),
      figure('profile-1', 'profiles', 'Profiles'),
    )
    document = updateReportFigure(document, 'profile-1', { caption: 'Reviewed caption' })
    assert.equal(document.groups[0].figures[0].caption, 'Reviewed caption')
    assert.deepEqual(parseReportAssembly(serializeReportAssembly(document)), document)
    assert.equal(removeReportFigure(document, 'profile-1').groups.length, 0)
  })

  it('migrates version 1 collections as legacy non-editable figures', () => {
    const current = addReportFigure(
      createReportAssemblyDocument(),
      figure('profile-1', 'profiles', 'Profiles'),
    )
    const legacy = {
      ...current,
      version: 1,
      groups: current.groups.map((group) => ({
        ...group,
        figures: group.figures.map(({ workspaceDraft: _draft, ...item }) => item),
      })),
    }

    const migrated = parseReportAssembly(JSON.stringify(legacy))

    assert.equal(migrated.version, 2)
    assert.equal(migrated.groups[0].figures[0].workspaceDraft, null)
  })

  it('keeps each exported workspace draft isolated from later edits', () => {
    const draft = {
      workspaceId: 'profiles',
      schemaVersion: 1,
      source: JSON.stringify({ title: 'First title' }),
    }
    const first = createReportFigure({
      workspaceId: 'profiles',
      workspaceLabel: 'Profiles',
      title: 'profile-1',
      caption: 'Profile caption',
      imageDataUrl: 'data:image/png;base64,AA==',
      widthPx: 1200,
      heightPx: 900,
      workspaceDraft: draft,
    })
    draft.source = JSON.stringify({ title: 'Second title' })

    assert.deepEqual(JSON.parse(first.workspaceDraft.source), {
      title: 'First title',
    })
  })

  it('rejects malformed or duplicate persisted figures', () => {
    const document = addReportFigure(
      createReportAssemblyDocument(),
      figure('profile-1', 'profiles', 'Profiles'),
    )
    const malformed = structuredClone(document)
    malformed.groups[0].figures[0].imageDataUrl = 'https://example.com/image.png'
    assert.throws(() => parseReportAssembly(JSON.stringify(malformed)), /malformed figure/)
    const duplicate = structuredClone(document)
    duplicate.groups.push({
      workspaceId: 'maps',
      workspaceLabel: 'Maps',
      figures: [{ ...duplicate.groups[0].figures[0], workspaceId: 'maps' }],
    })
    assert.throws(() => parseReportAssembly(JSON.stringify(duplicate)), /malformed figure/)
    const mismatchedDraft = structuredClone(document)
    mismatchedDraft.groups[0].figures[0].workspaceDraft!.workspaceId = 'maps'
    assert.throws(
      () => parseReportAssembly(JSON.stringify(mismatchedDraft)),
      /malformed workspace draft/,
    )
  })

  it('rejects an export draft owned by another workspace', () => {
    assert.throws(() => createReportFigure({
      workspaceId: 'profiles',
      workspaceLabel: 'Profiles',
      title: 'Profile',
      caption: 'Profile caption',
      imageDataUrl: 'data:image/png;base64,AA==',
      widthPx: 1200,
      heightPx: 900,
      workspaceDraft: {
        workspaceId: 'maps',
        schemaVersion: 1,
        source: '{}',
      },
    }), /does not match its report figure/)
  })
})
