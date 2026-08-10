# Tool Standardization Plan

This plan turns the findings in [Tool Inventory](TOOL-INVENTORY.md) into
deployable increments. The objective is to centralize reusable behavior without
forcing irrelevant tools into every workspace. A workspace declares which tool
capabilities apply; the shared implementation owns behavior, interaction,
persistence, and tests.

## Target Architecture

Each reusable tool will have one stable identifier and one owning module with:

1. a serializable state contract and defaults;
2. commands/use cases that do not depend on React;
3. a settings-panel module and applicability metadata;
4. optional canvas interaction tools with explicit hit targets and drag parts;
5. one or more renderer adapters for map, plot, or page surfaces;
6. schema migration and validation support;
7. contract, interaction, render, persistence, and workspace-conformance tests.

The workspace registry will declare supported tool IDs and provide only the
figure-specific context required by those tools. It will not reimplement shared
panels or pointer behavior.

Reusable positioned objects will use explicit coordinate spaces:

- **map** for hydraulic/geographic targets;
- **plot** for chart data anchors;
- **frame** for normalized positions anywhere inside the exported figure.

An anchored label will retain its map/plot origin while its displayed text box
uses a frame position. An optional leader connects them. This allows engineers
to drag labels across the complete figure area without losing the value's
hydraulic origin.

## Phase 1: Capability Baseline

**Status: implemented.** Stable tool IDs, per-workspace manifests, derived
compatibility fields, and executable binding conformance tests shipped as the
first standardization increment.

**Purpose:** make support claims executable before moving behavior.

- Add stable tool IDs and a `supportedTools` declaration to every registered
  figure workspace.
- Replace descriptive booleans such as `annotations: true` with derived
  capabilities from registered tools.
- Correct the Cross-Section annotation metadata mismatch.
- Add a conformance test that requires each declared tool to provide settings,
  state, renderer, persistence, and interaction bindings appropriate to its
  activation type.
- Add the declaration checklist to `FIGURE-WORKSPACE-TEMPLATE.md`.

**Acceptance:** no workspace can claim a tool that is absent from its UI or
render/export path, and adding a workspace requires an explicit tool manifest.

## Phase 2: Figure Object And Manipulation Kernel

**Status: foundation implemented.** The normalized object contract, immutable
collection and geometry operations, map/plot/frame coordinate adapters,
frame-clamped drag/nudge/duplicate behavior, external drag history commits,
and shared keyboard controls are in place. WSE text, leader, and automatic
result annotations are production adopters. Anchored callouts now support
independent endpoints, fixed extrema anchors, optional leaders, lock/reset,
and one-command drag history. Station labels are also production adopters;
report elements and chart objects remain scoped to the rollout phases below.

**Purpose:** provide one selection/drag foundation for every visual object.

- Introduce a tagged `FigureObject` contract with stable ID, kind, visibility,
  lock state, z-order, coordinate space, bounds, and optional anchor/leader.
- Extract shared select, hit-test, drag-body, drag-handle, nudge, duplicate,
  delete, reset, and clamp-to-frame commands.
- Promote pointer-session composition and editor command history into a shared
  figure-object controller.
- Add keyboard movement, Escape cancellation, focus restoration, and screen
  reader labels as required interactions.
- Provide map, plot, and frame coordinate adapters rather than embedding
  coordinate conversion in tools.

**Acceptance:** a synthetic object can be manipulated identically on map and
chart test surfaces, all commands undo/redo, and serialization is deterministic.

## Phase 3: Centerline Stationing And Anchored Labels

**Status: implemented.** Centerline-scoped IDs, normalized frame positions,
edge-attached leader styling, legacy override fallback, and the shared WSE/Plan
pointer tool are in production with render, interaction, UI, and persistence
regressions.

**Purpose:** deliver the highest-priority plan-view parity on the shared kernel.

- Extend station-label overrides with frame position and an optional leader
  style: visible, color, width, dash, and attachment edge.
- Keep the station tick/map point as the immutable origin of each label.
- Move station-label hit testing and drag behavior out of WSE-specific map tools
  into the stationing feature.
- Bind the same tool to WSE Difference and Plan-View Hydraulic Results.
- Let engineers toggle all labels, hide/show individual labels, drag each label
  anywhere in the figure, edit its text, and toggle/style its leader.
- Preserve multi-centerline identity so overrides cannot migrate to a similarly
  numbered station on another centerline.

**Acceptance:** WSE and Plan produce the same station-label behavior and
settings; moved labels preserve their origin, survive save/open and editable
export round trips, and render identically in downloaded PNGs and Word output.

## Phase 4: Shared Annotation And Callout Suite

**Status: implemented for map workspaces.** WSE Difference and Plan-View use
the same manual tool registry, editor panels, controller, pointer interactions,
render layer, persistence contract, and history behavior. WSE result labels and
extrema remain workspace extensions. Chart-coordinate adoption is intentionally
deferred until manual chart annotations become a requested workflow.

**Purpose:** make one annotation system available to any map or chart workspace.

- Move the WSE tool registry, controller, settings panels, interaction tools,
  and render binding under `features/annotations/`.
- Keep Text, Leader Callout, Arrow, and Line generic.
- Define result-label providers as workspace adapters, allowing WSE samples,
  cross-section values, profile values, or future result types without adding
  conditions to the annotation core.
- Implement Max/Min WSE as a WSE provider registered with the generic automatic
  result-label tool rather than as a special panel branch.
- Support drag body, text box, line endpoints, leader target, rotation,
  duplicate, delete, visibility, lock, z-order, and undo/redo for every
  applicable annotation.
- Roll out first to WSE, then Plan, XS, and Profiles where each tool is useful.

**Acceptance:** all annotations, callouts, arrows, lines, and text labels added
to a figure can be selected and dragged anywhere in that figure's valid frame;
the same tool has the same settings and shortcuts in every workspace.

## Phase 5: Figure Elements And Legends

**Status: implemented for map workspaces.** WSE Difference and Plan-View now
share frame-object adapters, canvas selection and dragging, position locking,
nudge/reset, isolated undo/redo history, element editors, and one numeric legend
shell. Chart-title and chart-legend adoption remains with the chart-style phase,
where plot-specific placement can be introduced without coupling map state.

**Purpose:** remove WSE-only interaction advantages from shared report elements.

- Adapt Title, Legend, Wet/Dry Key, North Arrow, and Scale Bar to the shared
  figure-object kernel.
- Move element hit testing/dragging out of WSE map tools and enable it in Plan.
- Create one legend shell for title, units, orientation, typography, box style,
  anchor, frame position, and drag behavior.
- Plug WSE difference classes, Plan scalar classes, wet/dry categories, and
  chart series into that shell through content adapters.
- Add shared chart-legend position controls so map and chart legends have
  consistent placement, styling, and direct manipulation.

**Acceptance:** every visible title, legend, north arrow, scale bar, wet/dry
key, and supported chart legend is directly draggable and uses the same style
vocabulary where semantics match.

## Phase 6: Cartography And Chart Style Tools

**Purpose:** standardize visual controls without merging different hydraulics.

- Centralize color-ramp selection, numeric classification bounds, interval
  validation, contour color/width/dash, and mesh-line styling under a
  cartography feature.
- Require an explicit contour mode: scalar isolines, class boundaries, or
  another registered source. This prevents WSE boundaries and WSE elevation
  contours from being confused again.
- Centralize chart line name, color, width, dash, visibility, and ordering.
- Centralize axes, grid, text, orientation, and plot-frame controls used by XS
  and Profiles.
- Keep hydraulic calculation and dataset-role decisions inside their owning
  figure use cases.

**Acceptance:** equivalent controls have the same labels, ranges, defaults,
validation, persistence, and tests across map or chart workspaces.

## Phase 7: Batch Production And Export Consistency

**Purpose:** let every workspace scale from one figure to a repeatable set.

- Extract a generic figure-set recipe/queue contract from Plan's implementation.
- Adapt Profiles all-station generation to that contract.
- Add optional recipes for WSE scenario/run pairs and selected XS assessment
  lines without changing single-figure editing.
- Standardize preview, stale state, include/exclude, caption, ordering, cancel,
  add-one, add-all, and regenerate actions.
- Keep Export Collection as the cross-workspace assembly owner and preserve
  editable source snapshots for every generated artifact.

**Acceptance:** each participating workspace can produce, review, edit, and add
a bounded figure set through the same workflow, while Export Collection remains
the only owner of final cross-workspace ordering and Word assembly.

## Phase 8: Rollout, Migration, And Guardrails

**Purpose:** complete adoption without regressions or permanent compatibility
branches.

- Roll out one workspace at a time: WSE reference implementation, Plan, XS,
  Profiles, then future workspaces.
- Add versioned migrations for station leaders, generic figure objects, legend
  state, and tool manifests.
- Preserve legacy project and Export Collection fixtures through migration
  tests; never silently discard an unsupported object.
- Add cross-workspace conformance suites for pointer behavior, keyboard access,
  PNG rendering, Word rendering, save/open, and editable-export round trips.
- Add visual regression fixtures for landscape/portrait, crowded station
  labels, long legend names, multiple centerlines, and off-center callouts.
- Remove old workspace-specific controllers only after their replacement has
  behavior and image parity.

**Acceptance:** all registered workspaces pass the same reusable-tool contract
suite, old project fixtures migrate, and the extension template can add a new
workspace by selecting tools rather than copying them.

## Intended Ownership After Completion

| Tool family | Central owner | Workspace responsibility |
| --- | --- | --- |
| Project lifecycle and drafts | `features/project-lifecycle/`, `features/project-workspace/` | Provide serializable draft adapter and input-recovery policy. |
| Models, layers, assessment inputs | `components/project-data/`, `features/assessment-lines/` | Declare required input capabilities. |
| Selection, dragging, history | `features/figure-objects/`, `features/map-interactions/`, `features/editor-history/` | Supply coordinate adapter and enabled object kinds. |
| Stationing and station labels | `features/stationing/` | Supply centerline candidates and render context. |
| Annotations and callouts | `features/annotations/` | Register optional result-sampling providers. |
| Titles, legends, north arrow, scale bar | `features/figure-elements/` | Supply legend content and applicable element IDs. |
| Classification, contours, mesh styles | `features/cartography/` | Supply scalar/class-boundary source and units. |
| Chart lines and axes | `features/chart-tools/` | Supply plotted series and semantic line roles. |
| Figure sets | `features/figure-sets/` | Supply a recipe that expands selections into figure specifications. |
| Report artifacts and Word assembly | `features/project-workspace/`, `features/report-assembly/` | Supply rendered artifact plus immutable editable draft snapshot. |

The standardization rule is: **centralize a tool after the second valid use,
but preserve figure-specific hydraulics behind adapters**. This avoids both
copying behavior and creating an oversized universal workspace component.
