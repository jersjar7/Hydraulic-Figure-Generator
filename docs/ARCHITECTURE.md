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
1,000-line source-file ceiling in local and deployment builds.

## Stable Core Boundaries

- `HydraulicEngine` owns loaded H5 resources and hydraulic run access. Its
  collaborators under `core/hydraulics/` own H5 reading, projection, scenario
  detection, run labels, WSE calculation, assessment lines, and extrema.
- `meshMatching.ts` owns spatial-index and comparison-point rules.
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
- `mapRenderer.ts` is the stable canvas facade and orchestrates a complete
  scene and settings snapshot without mutating application state.
- `projectFile.ts` is the stable persistence facade. Versioned schema,
  migrations, validation, serialization, and deserialization live under
  `core/projectFiles/`.
- `shapefile.ts` converts imported archives into internal overlays.
- `features/project-session/` owns the mutable engine revision, scenario
  catalog, role assignments, and per-scenario run selections.
- `features/figures/registry.ts` registers headless figure modules.
- `features/figures/workspaceRegistry.ts` associates those modules with React
  workspaces without pulling CSS or React into Node-based core tests.

New figure modules should consume these contracts rather than read H5 files or
draw shared map elements independently.

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

`App.tsx` is a figure-workspace host. The current editor is composed by
`features/wse-difference/WseDifferenceWorkspace.tsx`; calculation, legend,
frame, annotation, figure-element, canvas-sizing, rendering, and interaction
responsibilities live in focused hooks and components around that composition
root. Controls that become useful to a second figure should be promoted into a
focused shared component or hook rather than copied.

Prefer one reducer or feature hook per workflow over adding more independent
top-level state variables. A new figure type should live under
`src/features/<figure-name>/`, implement the `FigureModule` contract, and
register its headless module and React workspace separately. See
`docs/ADDING-A-FIGURE.md`.

Global project inputs and reusable analysis objects belong in the left panel.
The center workspace owns the selected output, while the right panel owns
settings for that output. Future chart and table features should consume the
shared, stationed assessment-line collection instead of duplicating it. Long
review collections must scroll inside a fixed-height feature view rather than
grow the workspace sidebar.

The left panel is a four-view project workflow:

- Models owns the H5 scenario catalog, role assignment, and run selection.
- Layers owns imported shapefile overlays.
- Assess owns assessment-line generation and centerline stationing.
- Review owns bounded included/review/excluded collections and per-line
  decisions.

Only one project workflow view is mounted at a time. Status badges summarize
progress without duplicating each view's controls, and the collapsed rail keeps
all four destinations reachable. Canvas selection may activate Review, but
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

Generated assessment geometry is reproducible and is not stored in the project.
The selected centerline, downstream direction, starting station, and per-line
review decisions are stored, then reapplied after the H5 files are regenerated.
Per-line WSE callout visibility and engineer-positioned label coordinates are
stored with those review decisions; leader targets remain derived from the
selected centerline intersections.
