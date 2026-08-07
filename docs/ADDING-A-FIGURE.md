# Adding A Figure

Add one report output at a time. A figure owns its calculation and presentation
while consuming shared project scenarios, overlays, and reusable engineering
objects.

## 1. Create The Feature

Create `src/features/<figure-name>/` with:

- A headless figure definition implementing `FigureModule`.
- A versioned workspace draft module implementing `WorkspaceDraftModule`.
- A React workspace component.
- Figure-specific defaults and settings types when they are not shared.
- Rendering and export adapters.
- A registered settings-section list; add editor tools through the shared tool
  contract instead of hard-coding toolbar branches.

The module must define its stable ID, readiness rule, scene construction,
render entry point, export filename, and input capabilities. Compose the UI with
`FigureWorkspaceScaffold`, compose canvas responsibilities as ordered render
layers, and call application use cases rather than parsing H5 directly.

Choose inputs from `WorkspaceInputCapability`. A declared capability must have
a project workflow registered in `projectWorkflowRegistry.ts`; this prevents a
workspace from advertising an input that the shared left panel cannot supply.

Add one file per render layer. Register the files in a short ordered facade;
do not place new layer implementations directly in the registry.

## 2. Register It

Register the headless definition and lazy React workspace together in
`features/figures/workspaceRegistry.ts` with `defineFigureWorkspace`. Follow the
copyable contract in `docs/FIGURE-WORKSPACE-TEMPLATE.md` and declare folder
draft, editable export, input recovery, and draft compatibility capabilities.
Pass the lazy workspace-owned draft-module loader alongside the figure definition. This is
the only workspace manifest: routing, the picker, figure metadata, and extension
tests are derived from it. Registration fails its extension contract when the
draft ID does not match the figure ID or its versioned create, serialize, and
parse functions are missing. Lazy loading keeps future workspace codecs out of
the startup bundle. Keep the headless figure definition and draft
codec free of React so engineering tests can still import them directly.

Reusable project inputs belong in a project-workflow module. Figure-only
controls belong in a settings-section module. Canvas behavior belongs in an
editor tool consumed by `MapInteractionRuntime`; user edits that need
undo/redo should execute an editor command.

## 3. Persist It

Shared scenarios and overlays belong under the project envelope's `project`
key. Figure settings, annotations, and derived-workflow decisions belong under
`figures[figureId]`. Generated geometry should remain reproducible unless there
is a documented reason to persist it.

Any schema change requires:

- A project version increment.
- Explicit validation and migration in `projectFile.ts`.
- A current round-trip test and a previous-version migration test.

The draft module must reuse that workspace's validated project parser and
serializer. Do not introduce an Export Collection-specific copy of the schema.
React runtime bindings for retaining and hydrating drafts are composed from
this module by the application workspace layer.

Inside the workspace component, bind the current serializable snapshot and its
hydration function with `useWorkspaceDraftRetention`. The shared repository
captures material draft changes, includes them in folder saves, and restores
them when the engineer returns or reopens the project. Keep generated canvases,
previews, transient notices, and
open-panel state outside the draft; they are runtime output or editor chrome,
not the editable figure document.

Every **Add to export** path must also attach a `WorkspaceDraftSnapshot` made
with `createWorkspaceDraftSnapshot` or the bound retention hook's `capture`
function. Capture at the same moment as the PNG. Batch exports must adjust any
selection stored in the snapshot for each generated figure (for example, each
hydraulic-profile artifact stores its own station ID). The report contract
requires this field so a future workspace cannot silently export an image that
loses its editable source. Use `null` only when migrating a legacy artifact
that never had a source draft.

No additional Export Collection routing is required for a registered workspace.
The shared `stageReportFigureDraft` flow resolves the registry entry and uses
its lazy draft codec automatically. Keep that codec backward-compatible when a
workspace can safely migrate old editable snapshots; otherwise incrementing its
schema version will make older artifacts remain image-only until an explicit
migration is added.

Render single-figure export controls with the shared
`ReportFigureExportActions`. Supply the registered workspace ID and a callback
that creates the current `NewReportFigure`; the shared control owns artifact
linking, replacement, duplication, and unlinking. Do not implement
workspace-specific update state. Batch actions may continue adding independent
artifacts, but must never replace a linked single figure as a side effect.

H5 binaries remain outside the folder project because browser file access is
permission-scoped. New H5-backed workspaces must use the shared project session
so the folder can retain source filenames and the Models workflow can request
those files after reopening. Do not serialize engine arrays into a workspace
draft. Text and geometry inputs that are already portable should be stored
through a folder adapter or the validated draft schema.

## 4. Test It

Before registration, add:

- Hand-calculated unit tests for engineering rules.
- A public-safe synthetic render baseline.
- Component tests for new controls and keyboard behavior.
- A Playwright path covering workspace selection and the primary workflow.
- A local real-file acceptance script when proprietary H5 data cannot be
  committed.
- Registration in the workspace manifest; `extensionContracts.test.ts`
  validates every manifest entry automatically.

Every commit must pass `npm run lint`, `npm test`, `npm run build`, and
`npm run test:e2e`.
