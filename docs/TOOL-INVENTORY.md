# Tool Inventory

This is the single inventory of engineer-facing tools in Hydraulic Figure
Generator. It records what is actually wired into each workspace, not only what
the figure metadata claims to support.

## Status Key

- **Full**: the tool is available and its complete current interaction is wired.
- **Partial**: some controls or rendering exist, but behavior differs from the
  strongest implementation elsewhere in the application.
- **No**: the workspace does not currently expose the tool.
- **N/A**: the tool is not meaningful for that figure type.

Workspace abbreviations used below:

- **WSE**: WSE Difference
- **XS**: Cross-Section Comparison
- **Plan**: Plan-View Hydraulic Results
- **Profiles**: Hydraulic Profiles & Sections
- **Export**: Export Collection

## Application And Project Tools

| Tool | Availability | Current owner | Notes |
| --- | --- | --- | --- |
| Workspace selection | All | `features/figures/workspaceRegistry.ts` | Registry-driven and lazy-loaded. Export Collection is the separate assembly destination. |
| New/Open/Save folder project | All | `features/project-lifecycle/` | Explicit saves, dirty-state tracking, refresh/close warning, portable workspace session, and active-workspace restoration. |
| Continue without project | All | `ProjectLifecycleGate` | Allows an intentionally transient session. |
| Editable workspace drafts | WSE, XS, Plan, Profiles | `features/figures/workspaceDraftRepository.ts` | One validated draft per workspace, retained across workspace navigation and stored in folder projects. |
| Edit exported figure | WSE, XS, Plan, Profiles, Export | `useWorkspaceEditingSession` and `ReportFigureExportActions` | An Export Collection artifact can open in its owning workspace, update in place, or become a new figure. |
| Diagnostics | Figure workspaces | `components/DiagnosticsWidget.tsx` | Persistent compact widget with expandable notices. |
| Collapsible input panel | Figure workspaces | Shared editor scaffold plus feature input panels | Inputs remain reachable after the initial load. Profiles owns a specialized input rail. |
| Generate/regenerate action | Figure workspaces | Shared scaffold/action bar with feature callbacks | Presentation is shared; calculation remains workspace-owned. |

## Shared Input Workflows

| Tool | WSE | XS | Plan | Profiles | Current owner and behavior |
| --- | --- | --- | --- | --- | --- |
| Add SMS H5 geometry/results | Full | Full | Full | N/A | Models workflow; arbitrary scenario names, role assignment, run selection, replace/remove, and H5 re-selection after project open. |
| Scenario roles and run pairing | Full | Full | Partial | N/A | Models workflow. WSE and XS use Baseline/Comparison; WSE may also use an Assessment source. Plan uses one selected scenario/run. |
| Zipped shapefile overlays | Full | Full | Full | N/A | Layers workflow; visibility, color, width, removal, projection handling, and project persistence. |
| Assessment-line generation | Full | Full | No | N/A | Assess workflow; derives reusable WSE lines from the selected assessment scenario at whole- or half-foot intervals. XS consumes a selected generated line. |
| Assessment-line stationing/review | Full | Partial | No | N/A | Review workflow; centerline intersection choice, include/review/exclude state, and per-line callout placement. XS consumes reviewed lines but does not display the review tools in its output settings. |
| SMS Summary Table input | N/A | N/A | N/A | Full | Paste or `.txt` drop; parses station labels and Z-min diagnostics. |
| SMS Profile Values input | N/A | N/A | N/A | Full | Paste or `.txt` drop; parses neutral datasets without guessing final engineering roles. |
| Profile dataset definition | N/A | N/A | N/A | Full | Existing/Proposed presets, add/remove, editable legend name, Ground/WSE/Other classification, and explicit station-order ground selection. |

## Map And Chart Tool Matrix

| Tool | WSE | XS | Plan | Profiles | Standardization observation |
| --- | --- | --- | --- | --- | --- |
| WSE comparison calculation | Full | Full | N/A | N/A | Calculations are intentionally figure-specific and should remain behind hydraulic use cases. |
| Dry-depth threshold | Full | Full | N/A | N/A | Same concept, currently exposed by separate panels and settings types. |
| Scalar-result selection | N/A | N/A | Full | N/A | Includes Topography, Mesh Elements, Topography + Mesh Elements, depth, WSE, velocity, Froude, and shear stress when present. |
| Color ramp | Full | N/A | Full | N/A | Shared catalog and cartography panel; each workspace supplies its accepted ramps and default. |
| Editable classification bounds/interval | Full | N/A | Full | N/A | Shared contract adapts symmetric WSE bounds and ranged Plan bounds without merging their hydraulics. |
| Contour lines | WSE class boundaries | N/A | Scalar isolines | N/A | Shared color, width, and pattern controls retain an explicit contour mode in each workspace adapter. |
| Mesh line style | N/A | N/A | Full | N/A | Shared cartography contract controls color, width, opacity, and pattern for applicable Plan outputs. |
| Newly wet/dry classification | Full | N/A | N/A | N/A | WSE-specific hydraulic layer and legend key. |
| Basemap frame/view | Full | Map selection view only | Full | N/A | WSE and Plan share orientation, rotation, zoom, aerial opacity, pan, and reset controls. |
| Shapefile display toggle | Full | Selection map only | Full | N/A | Overlay data is shared; output-level visibility is not expressed consistently. |
| Cross-section line selection/drawing | N/A | Full | N/A | N/A | Select generated assessment line or draw/remove a manual line; Reverse A/B and flip look direction. |
| Cross-section sampling | N/A | Full | N/A | N/A | Dry depth, sample spacing, Existing/Proposed ground and WSE, discharge-weighted averages, and rise/drop arrow. |
| Profile station generation/navigation | N/A | N/A | N/A | Full | Generates all detected stations, provides station tabs/previous/next navigation, and supports add-all-to-export. |
| Ground/WSE relationship controls | N/A | N/A | N/A | Full | Selects clipping ground, earth-fill ground, inundation ground, and shading WSE without assuming only one ground or surface. |
| Chart line styles | N/A | Full | N/A | Full | Shared series controls provide editable names, visibility, ordering, color, width, and line pattern; workspace adapters preserve each chart's semantic series IDs. |
| Chart axes and text | N/A | Full | N/A | Full | Shared axes controls provide labels, optional Y bounds, grid visibility/color, typography, plot fill, and frame styling. |

## Figure Elements

The shared `FigureElementsPanel` defines Title, Difference/Result Legend,
Wet/Dry Key, North Arrow, and Scale Bar. WSE and Plan use the same editors,
position schema, selection outline, direct canvas manipulation, position lock,
nudge/reset, keyboard actions, and isolated undo/redo history.

| Element/tool | WSE | XS | Plan | Profiles | Current interaction |
| --- | --- | --- | --- | --- | --- |
| Figure title | Full | Shared chart layout | Full | Shared chart layout | WSE and Plan share direct frame manipulation. Chart workspaces share title and orientation controls while keeping chart titles plot-scoped. |
| Difference/result legend | Full | Shared chart legend | Full | Shared chart legend | Map legends retain classification-specific content; chart legends share visibility, position, fill, border, opacity, and series adapters. |
| Wet/dry key | Full | N/A | N/A | N/A | Draggable, visible, styled, and independently positioned. |
| North arrow | Full | Selection map only | Full | N/A | WSE and Plan share direct manipulation and styling. |
| Scale bar | Full | Selection map only | Full | N/A | WSE and Plan share direct manipulation and styling. |
| Chart legend | N/A | Full | N/A | Full | Shared chart controls provide visibility, four-corner placement, fill, border, opacity, and ordered series content. |

## Centerline Stationing And Labels

The shared stationing panel currently provides:

- one or more visible centerline features with an active centerline for editing;
- downstream endpoint/direction and starting station;
- engineering/basic presets;
- minor, major, and label intervals plus optional range;
- tick side, color, lengths, and line widths;
- station label color, size, side, orientation, offset, decimals, prefix, and halo;
- endpoint labels and increasing-station arrow;
- per-label visibility, replacement text, direct drag, nudge, and reset;
- optional per-label leader visibility, color, width, dash, and attachment edge.

| Capability | WSE | Plan | Gap |
| --- | --- | --- | --- |
| Render multiple stationed centerlines | Full | Full | None in the shared computation/render contract. |
| Select/edit/hide an individual label in panel | Full | Full | None. |
| Drag an individual label on canvas | Full | Full | Shared stationing interaction tool and frame-space adapter. |
| Optional leader from moved label to station origin | Full | Full | Shared visibility, color, width, dash, and attachment controls. |
| Preserve labels through pan/zoom and export | Full | Full | Moved labels use normalized frame positions while their map anchors remain fixed. |
| Toggle all labels | Full | Full | Available through shared settings. |

## Annotations And Callouts

The generic manual annotation suite is shared by WSE Difference and Plan-View.
WSE adds hydraulic result-label and extrema providers on top of that core.

| Annotation tool | WSE | XS | Plan | Profiles | Current behavior |
| --- | --- | --- | --- | --- | --- |
| Select | Full | No | Full | No | Selects and opens the placed-item editor. |
| Text | Full | No | Full | No | Shared editable text, style, duplicate/delete, keyboard nudge, canvas drag, and undoable history. |
| Leader callout | Full | No | Full | No | Shared independent label/anchor dragging, optional leader, lock/reset, duplicate/delete, and history. |
| Arrow | Full | No | Full | No | Shared draggable line/endpoints with color, width, and dash controls. |
| Straight line | Full | No | Full | No | Shared draggable line/endpoints with color, width, and dash controls. |
| Automatic result label | Full | No | No | No | Kernel-backed callout that samples hydraulic fields, refreshes when its anchor moves, and supports optional leader, lock/reset, duplicate/delete, and undoable manipulation. |
| Max/min WSE callouts | Full | No | No | No | Creates editable maximum-rise and maximum-reduction result callouts. |
| Undo/redo | Full | No | Full | No | Each map workspace owns an independent bounded annotation history. |

The executable tool registry now records XS annotations as **No**. A workspace
can declare annotation support only when it supplies the required settings,
state, renderer, persistence, and canvas-interaction bindings, preventing the
old descriptive-metadata mismatch from returning.

## Assessment WSE Labels

WSE assessment labels are separate from generic annotations. They support a
global visibility toggle, per-line visibility, font/color/offset/side controls,
individual nudge/reset, and canvas dragging. Their leader remains anchored to
the selected centerline intersection. This behavior is a strong reference for
the future shared anchored-label contract, but its state and renderer are still
assessment-specific.

## Batch, Document, And Export Tools

| Tool | WSE | XS | Plan | Profiles | Export Collection |
| --- | --- | --- | --- | --- | --- |
| Download current PNG | Full | Full | Full | Full | Preview only |
| Add current figure to export | Full | Full | Full | Full | Receives artifact |
| Update linked exported figure | Full | Full | Full | Full | Opens source workspace |
| Save edited figure as new | Full | Full | Full | Full | Opens source workspace |
| Generate figure set | No | No | Full | Full (all stations) | N/A |
| Batch include/review | No | No | Full | Station navigation | N/A |
| Workspace-grouped thumbnails | N/A | N/A | N/A | N/A | Full |
| Reorder figures within workspace | N/A | N/A | N/A | N/A | Full by drag or buttons |
| Reorder workspace groups | N/A | N/A | N/A | N/A | Full by drag or buttons |
| Figure preview/title/caption | N/A | N/A | N/A | N/A | Full |
| Export Word document | No | No | Full plan-view document and shared collection | Through shared collection | Full multi-workspace document |

## Main Duplication And Consistency Gaps

1. Map and chart legends intentionally use separate content adapters for map
   classifications and chart series, while their matching style vocabulary is
   standardized within each figure family.
2. Figure Set behavior is mature in Plan and all-station generation exists in
   Profiles, but there is no common batch-production contract presented to
   every workspace.
3. Chart titles and legends now share plot-aware settings and renderers, but do
   not yet participate in direct canvas dragging or figure-object undo/redo.
4. Assessment WSE labels use anchored behavior but retain an
   assessment-specific controller and style contract.
