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
  touches the File System Access API. Hydraulic Profiles & Sections is the
  first workspace adapter, with additional workspaces added as independent
  persistence slices.
- Folder projects write `project.hfg.json` last, after their editable input and
  workspace documents. This keeps the manifest from claiming a partially
  completed save. Derived canvas scenes are regenerated from persisted inputs.
- `features/figures/settingsSectionModule.ts` defines the typed settings-panel
  registry; `features/tools/editorToolModule.ts` defines editor-tool metadata
  and activation contracts.
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
  repository, captures its latest editable snapshot on navigation, and
  hydrates it when the workspace mounts again. The repository stores no React
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
- `features/figure-sets/` owns production-view navigation. Figure-specific
  recipes expand valid selections and generate previews inside their owning
  feature; they do not add batch branches to `App.tsx`.
- `components/editor/FigureWorkspaceScaffold.tsx` composes the reusable
  project/sidebar, map, and settings regions. Figure workspaces provide
  feature content and callbacks rather than rebuilding the editor frame.
- `application/hydraulics/` owns focused comparison, assessment, stationing,
  and extrema use cases behind `HydraulicAnalysisPort`. `HydraulicEngine`
  remains the H5-backed resource and value-cache adapter.
- `features/map-interactions/MapInteractionRuntime` owns pointer-session
  lifecycle. Feature tools own hit testing and the behavior of one action.
- `features/editor-history/` owns immutable editor commands and bounded
  undo/redo history independently of any annotation UI.
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
Every registered figure, tool set, settings registry, project workflow, and
render pipeline must pass it.

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
and Plan-View Hydraulic Results are separate composition roots; input, project-file, generation,
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

Saved project version 14 has an `activeFigure` discriminator, shared `project`
state, and a `figures` record containing versioned figure-specific state. Load
all project JSON through `parseHydraulicFigureProject`; never cast parsed JSON
directly into application types. Add an explicit migration and regression test
whenever the persisted shape changes.

Version 13 and earlier flat files migrate into the normalized version 14
project. Version 12 stores scenario role IDs, per-scenario run selections, and
user scenario labels. Version 11 Existing/Proposed run selections migrate to
Baseline `EX`, Comparison `PR`, and assessment source `EX`.

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
