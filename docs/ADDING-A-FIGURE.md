# Adding A Figure

Add one report output at a time. A figure owns its calculation and presentation
while consuming shared project scenarios, overlays, and reusable engineering
objects.

## 1. Create The Feature

Create `src/features/<figure-name>/` with:

- A headless figure definition implementing `FigureModule`.
- A React workspace component.
- Figure-specific defaults and settings types when they are not shared.
- Rendering and export adapters.
- A registered settings-section list; add editor tools through the shared tool
  contract instead of hard-coding toolbar branches.

The module must define its stable ID, readiness rule, scene construction,
render entry point, and export filename. Compose the UI with
`FigureWorkspaceScaffold`, compose canvas responsibilities as ordered render
layers, and call application use cases rather than parsing H5 directly.

Add one file per render layer. Register the files in a short ordered facade;
do not place new layer implementations directly in the registry.

## 2. Register It

Register the headless definition in `features/figures/registry.ts`. Register its
React workspace in `features/figures/workspaceRegistry.ts`. Keeping these
registries separate allows Node regression tests to import figure calculations
without loading React or CSS.

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

## 4. Test It

Before registration, add:

- Hand-calculated unit tests for engineering rules.
- A public-safe synthetic render baseline.
- Component tests for new controls and keyboard behavior.
- A Playwright path covering workspace selection and the primary workflow.
- A local real-file acceptance script when proprietary H5 data cannot be
  committed.
- Registration in `tests/extensionContracts.test.ts`.

Every commit must pass `npm run lint`, `npm test`, `npm run build`, and
`npm run test:e2e`.
