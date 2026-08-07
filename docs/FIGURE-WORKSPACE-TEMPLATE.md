# Figure Workspace Template

Use this checklist for every new figure-producing workspace. The registry and
contract tests deliberately reject partial integrations.

## Files

Create a self-contained `src/features/<figure-name>/` feature with:

- `<figureName>Figure.ts`: headless `FigureModule` definition.
- `<figureName>WorkspaceDraft.ts`: versioned create/serialize/parse contract.
- `<FigureName>Workspace.tsx`: editor composition using shared shells.
- Focused document, settings, scene-builder, renderer, and report-adapter files.
- Unit, UI, synthetic render, migration, and primary Playwright tests.

## Registry Entry

```ts
defineFigureWorkspace({
  figure: exampleFigure,
  capabilities: {
    folderDraft: true,
    editableExport: true,
    inputRecovery: 'reselect-hydraulic-files',
    draftCompatibility: { mode: 'current-only' },
  },
  loadDraft: () => import('./exampleWorkspaceDraft').then(
    (module) => module.exampleWorkspaceDraft,
  ),
  loadWorkspace: () => import('./ExampleWorkspace').then((module) => ({
    default: module.ExampleWorkspace,
  })),
})
```

Use `inputRecovery: 'portable'` only when every required input is serialized in
the validated draft or a folder adapter. H5-backed workspaces use
`'reselect-hydraulic-files'`; source filenames are restored as a recovery list,
but browser permission rules require the engineer to re-add those files.

Declare `draftCompatibility: { mode: 'migrates-legacy', oldestVersion: N }`
when the parser supports older drafts. Add the oldest supported source to
`tests/workspaceDraftCompatibility.test.ts`; the registry contract fails if a
migrating workspace lacks that fixture.

## Required Integration

1. Bind the current serializable state with `useWorkspaceDraftRetention`.
2. Render `ReportFigureExportActions` for single-figure export paths.
3. Attach a workspace draft snapshot to every single and batch artifact.
4. Reuse project input, settings-section, tool, interaction, and render-layer
   registries instead of adding workspace-specific shell branches.
5. Keep canvases, generated scenes, notices, and open-panel state transient.
6. Run `npm run lint`, `npm run check:architecture`, `npm test`,
   `npm run build`, and `npm run test:e2e` before shipping.
