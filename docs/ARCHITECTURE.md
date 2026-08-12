# Architecture

## Dependency Direction

The application uses seven layers:

1. `src/core/contracts/` defines shared hydraulic and figure contracts;
   `core/types.ts` is the stable compatibility facade.
2. Core services parse files, compare meshes, validate projects, and render
   figures without depending on React.
3. `src/application/` owns use cases and ports for importing inputs and
   persisting projects. It may depend on core, but not React, features, or
   browser adapters.
4. `src/infrastructure/` implements application ports for browser downloads
   and third-party archive readers.
5. Feature hooks own bounded workflow state such as project sessions and
   assessment review.
6. Figure modules own calculation, settings, rendering, export, and workspace
   composition for one output.
7. `App.tsx` selects a registered figure workspace and contains no
   figure-specific behavior.

Dependencies point inward: infrastructure may use application and core;
application may use core; core imports only core. Core and application modules
must not import React. `npm run check:architecture` enforces these rules and a
600-line source-file ceiling in local and deployment builds. Workspace
composition roots have a stricter 500-line ceiling and may not import browser
infrastructure directly.

## Stable Core Boundaries

- `HydraulicEngine` owns loaded H5 resources and hydraulic run access. Its
  collaborators under `core/hydraulics/` own H5 reading, projection, scenario
  detection, run labels, WSE calculation, assessment lines, and extrema.
- Generic scalar-result discovery and final-timestep access also stay behind
  `HydraulicAnalysisPort`; Plan-View UI code never reads HDF5 paths directly.
- `core/contracts/figureSet.ts` separates portable figure specifications from
  ephemeral preview status. `application/figure-sets/` owns the reusable
  recipe contract and bounded, cancellable generation queue without React.
- `meshMatching.ts` owns spatial-index and comparison-point rules.
- `core/hydraulic-profiles/` owns the clipboard-profile domain pipeline.
  Parsing yields neutral series; focused services group complete station
  blocks, analyze candidate station grounds, validate the engineer-reviewed
  mapping, build classified section lines, and pair sections with Summary Table
  rows by thalweg/station order. React panels do not infer or mutate hydraulic
  line roles during rendering.
- `assessmentLines.ts` turns the selected assessment-source WSE surface into reusable,
  level-aware map polylines. It does not own their UI or cartographic style.
- `centerlineStationing.ts` is the stable facade for focused services under
  `core/stationing/`, which extract centerlines, generate ticks, intersect
  assessment paths, and assign directed stations.
- `features/assessment-lines/` owns review navigation and user decisions. The
  core stationing service remains independent of React.
- `core/map/` owns reusable view transforms, annotation geometry, hydraulic
  sampling, basemaps, overlays, stationing, assessment layers, hydraulic
  classes, and individual report elements.
- `mapRenderer.ts` is the stable canvas facade. Ordered modules in
  `core/map/wseDifferenceRenderLayers.ts` compose the basemap, hydraulic,
  overlay, annotation, and report-element layers without mutating application
  state. Each implementation under `core/map/wse-difference-layers/` owns
  exactly one render layer.
- `projectFile.ts` is the stable persistence facade. Versioned schema,
  migrations, validation, serialization, and deserialization live under
  `core/projectFiles/`.
- `shapefile.ts` converts imported archives into internal overlays.
- `features/project-session/` owns the mutable engine revision, scenario
  catalog, role assignments, and per-scenario run selections.
- `features/project-document/` owns shared persisted state such as overlays.
  Figure documents own only settings and annotations for that output.
- `features/project-lifecycle/` owns the explicit New/Open/Save lifecycle,
  dirty-state comparison, and unsaved-change protection. Folder I/O remains
  behind `ProjectFolderStoragePort`; the browser adapter is the only layer that
  touches the File System Access API. Workspace adapters persist profile inputs,
  the Export Collection, and the shared editable workspace session.
- `ProjectCommandBar` and `useHydraulicProjectCommands` are the single UI and
  command boundary for project New, Save, and Open. They live in the global
  header, report one consistent outcome, and are never reimplemented by a
  figure workspace. Workspace Reset remains a local callback because its state
  is figure-specific, but it must execute through the shared unsaved-change
  confirmation. Opening a folder increments the lifecycle hydration revision,
  remounting the active composition root after all workspace adapters apply.
- Folder projects write `project.hfg.json` last, after their editable input and
  workspace documents. This keeps the manifest from claiming a partially
  completed save. Derived canvas scenes are regenerated from persisted inputs.
- `features/figures/settingsSectionModule.ts` defines the typed settings-panel
  registry; `features/tools/editorToolModule.ts` defines editor-tool metadata
  and activation contracts.
- `features/tools/figureToolCapability.ts` is the stable engineer-facing tool
  registry. Each figure editor declares `supportedTools` with concrete
  settings, state, render, persistence, interaction, and export bindings.
  Workspace metadata and compatibility flags are derived from that manifest;
  extension tests reject incomplete or misleading support claims.
- `features/figure-elements/` owns frame-positioned title, legend, wet/dry key,
  north-arrow, and scale-bar manipulation. It projects each workspace's own
  settings into the shared figure-object kernel, commits drag/nudge/style
  changes to an element-only history slice, and never shares positions between
  figures. Numeric map legends share their layout shell under `core/map/` while
  hydraulic class values and colors remain figure-owned adapters.
- `features/figures/workspaceRegistry.ts` is the single figure manifest. It
  associates headless modules with lazy React workspaces and lazy versioned
  workspace draft codecs, then derives figure IDs, picker entries, routing,
  and extension coverage. Every figure-producing workspace owns a
  `WorkspaceDraftModule` that creates, serializes, and validates its editable
  document through the feature's established project schema. Runtime draft
  retention and restoration bind to this contract without adding
  workspace-specific branches to the Export Collection. Draft codecs load only
  when draft behavior needs them, so adding workspaces does not inflate the
  startup bundle.
- `features/figures/workspaceDraftRepository.ts` retains one validated,
  serialized working draft per figure workspace for the current browser
  session. `useWorkspaceDraftRetention` binds a mounted workspace to that
  repository, captures its latest editable snapshot as it changes and on
  navigation, and hydrates it when the workspace mounts again. The repository stores no React
  state, canvases, or generated hydraulic scenes. Export-figure ownership and
  folder persistence are separate layers built on the same draft contract.
- Export Collection schema version 2 stores an immutable `WorkspaceDraftSnapshot`
  with each newly generated `ReportFigureArtifact`. The snapshot is serialized
  when the engineer chooses **Add to export**, so later edits to the live
  workspace cannot change an existing report figure's editable source. Legacy
  version-1 collections migrate with `workspaceDraft: null`; they remain valid
  image artifacts but cannot become editable retroactively. Opening a snapshot
  in its owning workspace is an application-navigation concern layered on top
  of this ownership contract.
- `features/project-workspace/stageReportFigureDraft.ts` implements that launch
  concern without workspace-specific branches. It resolves the owning entry in
  the figure-workspace registry, lazy-loads its codec, verifies ownership and
  schema compatibility, parses the source, stages it in the session repository,
  and only then navigates. Launching uses the artifact as a starting point; the
  source artifact in the Export Collection remains immutable.
- An opened artifact is linked to its workspace through a per-workspace edit
  target. `workspace-session.hfg.json` persists those links together with the
  latest registered workspace drafts, so an engineer can reopen the folder and
  continue editing the same exported artifact. `ReportFigureExportActions` owns the generic
  **Update exported figure**, **Save as new figure**, and unlink controls.
  Updating replaces the artifact contents while preserving its ID, creation
  time, workspace band, and report order; saving as new creates an independent
  artifact and links subsequent updates to that copy.
- `useWorkspaceEditingSession` coordinates draft storage, persisted edit links,
  input-recovery references, and open-in-workspace navigation. The root project
  provider composes that coordinator with folder adapters instead of owning
  those state machines directly. Project dirty-state fingerprints include the
  active workspace as well as persisted documents, so the next reopening
  location cannot change without an explicit save.
- Browser security prevents silently reopening H5 source files. The workspace
  session therefore stores scenario labels and source filenames, resets the
  in-memory hydraulic engine on project open, and presents the missing files in
  the Models workflow. Profile text and parsed shapefile overlays are portable
  project content and restore directly.
- `features/figure-sets/` owns production-view navigation. Figure-specific
  recipes expand valid selections and generate previews inside their owning
  feature; they do not add batch branches to `App.tsx`.
- `components/editor/FigureWorkspaceScaffold.tsx` composes the reusable
  project/sidebar, map, and settings regions. Figure workspaces provide
  feature content and callbacks rather than rebuilding the editor frame.
- `App.tsx` owns global editor-header composition through
  `EditorHeaderNavigationProvider`. The workspace picker and Export Collection
  action, project status, and project commands are injected once into
  `FigureEditorShell`; figure workspaces cannot import or pass those global
  controls through their own props.
- `application/hydraulics/` owns focused comparison, assessment, stationing,
  and extrema use cases behind `HydraulicAnalysisPort`. `HydraulicEngine`
  remains the H5-backed resource and value-cache adapter.
- `features/map-interactions/MapInteractionRuntime` owns pointer-session
  lifecycle. Feature tools own hit testing and the behavior of one action.
- `features/editor-history/` owns immutable editor commands and bounded
  undo/redo history independently of any annotation UI.
- `core/contracts/figureObjects.ts` defines the normalized runtime shape for a
  directly manipulated object. `features/figure-objects/` owns immutable
  selection, drag, nudge, duplicate, remove, reset, frame-clamping, coordinate
  adapter, keyboard, and command composition. Workspace adapters project their
  persisted objects into this shape and write edits back; the kernel never owns
  a cross-workspace document or global object positions.
- `features/annotations/` owns the shared Select, Text, Leader Callout, Arrow,
  and Line registry, editor controller and panels, pointer tool, collection
  operations, history commands, and render contract used by WSE Difference and
  Plan-View. Callout labels and anchors have separate drag targets; visibility,
  locking, layer order, duplicate/delete/reset, and undo/redo behave identically
  in both workspaces. WSE automatic-result and extrema tools remain adapters on
  top of the shared manual suite rather than hydraulic conditions in its core.
- Centerline station labels use the same kernel through a stationing-owned
  adapter and pointer tool. Their hydraulic station remains a fixed map anchor,
  while an engineer-moved label is persisted as a normalized frame position
  with an optional edge-attached leader. WSE Difference and Plan-View bind the
  same interaction tool, so neither workspace owns station-label drag rules.
- WSE project schema version 16 and Plan-View schema version 8 persist the
  frame-positioned label and leader contract. Legacy map-positioned labels are
  read unchanged and migrate to centerline-scoped IDs and frame coordinates
  the next time the engineer edits them.
- `components/project-data/projectWorkflowRegistry.ts` maps declared workspace
  input capabilities to independent Models, Layers, Assess, and Review workflow
  modules with their own status and view adapters.

New figure modules should consume these contracts rather than read H5 files or
draw shared map elements independently.

Hydraulic profile presets are editable starting points, not trusted data
descriptions. Generation remains blocked when the detected station-order ground
is classified as another line type. Applying the detected mapping is explicit;
standard one-ground presets may rank the remaining WSE names by elevation,
while custom multi-ground mappings preserve the engineer's classifications.
Summary Z-min values diagnose the resulting order and never directly join one
section to one station.

`tests/support/extensionContracts.ts` is the executable extension contract.
Every registered figure, declared tool binding, settings registry, project
workflow, and render pipeline must pass it.

## Refactoring Rules

- Preserve public imports through a small facade when partitioning a mature
  module. Move implementation ownership first; migrate consumers only when it
  improves the boundary.
- Prefer one responsibility per file. A stateful coordinator such as
  `HydraulicEngine` may remain a class, while parsing, calculation, validation,
  rendering, and formatting stay in stateless collaborators.
- Keep React state and event coordination in feature hooks. Settings panels
  receive typed values and callbacks; they do not read files or draw maps.
- Keep canvas renderers deterministic from their scene, bounds, settings, and
  overlays. They must not mutate React or project state.
- Partition styles by the component or feature that owns them. `App.css`
  controls import order so cascade changes are explicit.
- Add or preserve a regression test before moving behavior across a boundary.
  Structural refactors must keep accepted hydraulic values and rendered output
  unchanged.

## Scenario Roles

`HydraulicEngine` stores a catalog of named scenarios. Existing (`EX`),
Proposed/FHD (`PR`), and Natural (`NA`) are recognized conventions, while
matching custom filename stems create additional stable scenario IDs. The WSE
Difference workspace assigns three independent roles from that catalog:

- Baseline is the minuend reference surface.
- Comparison is subtracted against the Baseline (`Comparison - Baseline`).
- Assessment source supplies reusable WSE assessment lines.

Run selection is keyed by scenario ID rather than by role. A scenario can move
between roles without losing its selected run. Do not add fixed React state or
engine methods for each new scenario name; extend detection only for a genuine
industry naming convention and let other alternatives use the generic stem
contract.

## Frontend Growth

`App.tsx` is a figure-workspace host. WSE Difference, Cross-Section Comparison,
Plan-View Hydraulic Results, and Hydraulic Profiles & Sections are separate composition roots; input, project-file, generation,
map-canvas, settings, rendering, and interaction responsibilities live in
focused controllers and components around them. Settings sections and tools
are registered modules rather than conditional branches in a workspace.
Controls that become useful to a second figure are promoted into a focused
shared component or action instead of copied.

Prefer one reducer or feature hook per workflow over adding more independent
top-level state variables. A new figure type should live under
`src/features/<figure-name>/`, implement the `FigureModule` contract, and
register its headless module and lazy React workspace together. See
`docs/ADDING-A-FIGURE.md`.

Global project inputs and reusable analysis objects belong in the left panel.
The center workspace owns the selected output, bounded Figure Set gallery, or
page-oriented Document preview, while the right panel owns settings for that
active production view. Future
chart and table features should consume the
shared, stationed assessment-line collection instead of duplicating it. Long
review collections must scroll inside a fixed-height feature view rather than
grow the workspace sidebar.

Workspace composition roots coordinate established feature controllers; they
do not own hydraulic generation algorithms. Cross-Section Comparison delegates
selection-map, chart, and assessment-line generation to
`useCrossSectionGeneration`, while selection and rendering remain independent
hooks. WSE Difference routes persisted settings and cartography updates through
its figure-document controller, and bounded diagnostics and transient reset
behavior through its editor-UI controller. `useWseWorkspaceLifecycle` owns
project inputs, draft retention, stationing-source actions,
invalidation, and full reset. `createWseWorkspaceOutputController` owns map
download and report-figure creation. Generation, rendering, annotations,
figure elements, and pointer interactions remain independent controllers.
Plan-View Hydraulic Results routes transient panel and production-mode state
through `usePlanViewWorkspaceUi`; `usePlanViewSingleFigure` owns active-preview
generation, invalidation, result selection, figure-set item editing, and reset.
`withPlanViewOutputSettings` is the single policy for applying result metadata
to auto-selected, manually selected, and figure-set output settings.
Hydraulic Profiles & Sections routes SMS parsing, mapping review, and derived
datasets through `useHydraulicProfileAnalysis`; station selection, batch scene
generation, invalidation, and hydration through
`useHydraulicProfileGeneration`; and canvas rendering and export construction
through dedicated rendering and output controllers. Its composition root owns
only project wiring and panel composition, while transient panel state and
bounded runtime notices live in `useHydraulicProfilesWorkspaceUi`.

The complete hydraulic left panel offers four project workflows:

- Models owns the H5 scenario catalog, role assignment, and run selection.
- Layers owns imported shapefile overlays.
- Assess owns assessment-line generation and centerline stationing.
- Review owns bounded included/review/excluded collections and per-line
  decisions.

Each figure declares the input capabilities it needs, so only relevant
workflows appear. Only one workflow view is mounted at a time. Status badges
summarize progress without duplicating each view's controls, and the collapsed
rail keeps every enabled destination reachable. Canvas selection may activate Review, but
canvas dragging must not resize or reveal a sidebar until pointer release.

## Resource Ownership

H5 dataset files remain open because values are read lazily. `HydraulicEngine`
closes the HDF5 handle and unlinks its WASM file when a condition is replaced,
removed, or reset. Geometry files are closed immediately after parsing.

The basemap cache stores at most 256 tile responses. Render canvases and decoded
image bitmaps remain render-local.

## Persistence

Saved project version 15 has an `activeFigure` discriminator, shared `project`
state, and a `figures` record containing versioned figure-specific state. Load
all project JSON through `parseHydraulicFigureProject`; never cast parsed JSON
directly into application types. Add an explicit migration and regression test
whenever the persisted shape changes.

Version 15 persists anchored-callout visibility, position locks, and reset
baselines. Version 14 callouts migrate visible and unlocked, with their saved
points used as the reset baseline. Version 13 and earlier flat files migrate
into the normalized version 14 project. Version 12 stores scenario role IDs,
per-scenario run selections, and user scenario labels. Version 11
Existing/Proposed run selections migrate to Baseline `EX`, Comparison `PR`, and
assessment source `EX`.

The Plan-View workspace stores figure-set specifications, per-item settings,
captions, order, inclusion, and document assembly settings in its version 3
envelope. Versions 1 and 2 migrate to document defaults, and version 1 also
migrates to an empty set. Runtime status, generated scenes, thumbnail URLs, and
full-resolution export images are intentionally never persisted; they become
stale and regenerate after local H5 files are restored. Word export renders
included figures sequentially through the shared recipe and releases each
canvas after it is encoded, avoiding a report-size image cache for large sets.

Generated assessment geometry is reproducible and is not stored in the project.
The selected centerline, downstream direction, starting station, and per-line
review decisions are stored, then reapplied after the H5 files are regenerated.
Per-line WSE callout visibility and engineer-positioned label coordinates are
stored with those review decisions; leader targets remain derived from the
selected centerline intersections.
