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

## First Adopter

WSE text annotations use the kernel for canvas dragging, nudge controls,
keyboard arrows, duplication geometry, removal, and frame clamping. Their
persisted `MapAnnotation` representation is unchanged, so existing project and
editable-export files remain compatible.
