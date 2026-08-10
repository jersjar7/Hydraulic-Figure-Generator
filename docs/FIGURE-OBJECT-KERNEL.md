# Figure Object Kernel

The figure-object kernel standardizes direct manipulation without sharing
figure state. Every workspace continues to own its own persisted document and
undo/redo history.

## Contract

`FigureObject` is a normalized runtime projection with:

- a stable ID and tagged kind;
- visibility, lock state, and z-order;
- map, plot, or frame coordinates;
- geometry points and optional bounds;
- an optional fixed anchor and leader relationship.

The shared feature supplies immutable collection operations, body and point
dragging, frame clamping, duplication, reset, coordinate adapters, keyboard
commands, and history support for live pointer previews.

## Workspace Adoption

1. Keep the workspace's existing validated persisted object.
2. Add a feature-owned `FigureObjectAdapter` that projects it into the shared
   contract and applies normalized geometry back to the persisted object.
3. Use the workspace's map, plot, or frame coordinate adapter.
4. Preview pointer movement through the shared drag geometry.
5. Commit the completed before/after values to that workspace's editor history
   as one change; restore the original value on cancellation.
6. Cover movement, clamping, undo/redo, persistence, and keyboard behavior.

Do not store normalized objects globally or reuse one instance between
workspaces. Reuse behavior and contracts, not figure-instance state.

## Current Adopters

WSE Difference and Plan-View manual annotations use the kernel for canvas
dragging, endpoint manipulation, nudge controls, keyboard arrows, duplication,
removal, visibility, position locking, layer order, and frame clamping. The
shared editor and pointer tool live under `features/annotations/`; WSE result
labels and extrema extend that suite through workspace adapters.

WSE leader and automatic-result callouts use it for independent anchor and
label dragging, fixed hydraulic-extremum anchors, leader visibility, position
locking, creation-position reset, duplication, deletion, keyboard nudge, and
one-command drag history. Project-file version 15 persists the new optional
callout fields; version 14 callouts load visible and unlocked with their saved
position as the reset baseline.

Centerline station labels use a mixed-space adapter: the generated station tick
is an immutable map anchor and the displayed label is a normalized frame point.
The shared stationing pointer tool moves only the label, clamps it inside the
report frame, and renders an optional styled leader to the chosen text-box edge.
WSE Difference and Plan-View use this same adapter and tool. WSE project-file
version 16 and Plan-View project-file version 8 persist the label-frame and
leader fields; older map-coordinate overrides remain readable and migrate when
edited.

Frame-positioned report elements are also production adopters. WSE Difference
and Plan-View use the same hit testing, selection outline, clamped drag, lock,
nudge, reset, keyboard, and undo/redo behavior for titles, numeric legends,
north arrows, scale bars, and the WSE-only wet/dry key. Each workspace retains
its own persisted positions and styles. Difference and scalar result legends
share one orientation-aware numeric legend shell, with figure-specific value
and color adapters.
