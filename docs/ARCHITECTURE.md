# Architecture

## Dependency Direction

The application uses four layers:

1. `src/core/types.ts` defines shared hydraulic and figure contracts.
2. Core services parse files, compare meshes, validate projects, and render
   figures without depending on React.
3. Components own focused controls and widgets.
4. `App.tsx` coordinates the current WSE Difference workspace.

Dependencies should point toward the core. Core modules must not import React,
DOM components, or application state.

## Stable Core Boundaries

- `HydraulicEngine` owns loaded H5 resources and hydraulic run access.
- `meshMatching.ts` owns spatial-index and comparison-point rules.
- `mapRenderer.ts` receives a complete scene and settings snapshot and renders
  it without mutating application state.
- `projectFile.ts` is the only boundary for persisted project JSON.
- `shapefile.ts` converts imported archives into internal overlays.

New figure modules should consume these contracts rather than read H5 files or
draw shared map elements independently.

## Condition Roles

The first figure compares two semantic roles: Existing (`EX`) and Proposed
(`PR`). These keys describe the WSE Difference calculation, not every possible
model condition. Natural, future, or alternative scenarios should be introduced
through a generic scenario catalog before adding multi-condition figures; do
not keep extending filename regular expressions as the scenario model.

## Frontend Growth

`App.tsx` remains larger than the desired long-term shell. Extract behavior in
this order, preserving tests after every step:

1. Project commands and defaults.
2. H5 and overlay input workspace.
3. Annotation state and pointer interactions.
4. Map render scheduling and export.
5. WSE Difference settings panels.

Prefer one reducer or feature hook per workflow over adding more independent
top-level state variables. A new figure type should live under
`src/features/<figure-name>/` and register with the workspace shell.

## Resource Ownership

H5 dataset files remain open because values are read lazily. `HydraulicEngine`
closes the HDF5 handle and unlinks its WASM file when a condition is replaced,
removed, or reset. Geometry files are closed immediately after parsing.

The basemap cache stores at most 256 tile responses. Render canvases and decoded
image bitmaps remain render-local.

## Persistence

Saved projects have both a `version` and a `figure` discriminator. Load all
project JSON through `parseHydraulicFigureProject`; never cast parsed JSON
directly into application types. Add an explicit migration and regression test
whenever the persisted shape changes.
