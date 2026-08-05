# Hydraulic Figure Generator

A React workspace for producing report-ready hydraulic figures from SRH-2D and
SMS H5 exports. Files are processed locally in the browser and are never
uploaded.

The application currently provides three independently registered workspaces:

- **WSE Difference** compares two hydraulic scenarios for FRA mapping.
- **Cross-Section Comparison** samples Existing and Proposed hydraulics along
  a drawn or generated assessment line.
- **Plan-View Hydraulic Results** replaces the first Appendix K workflow slice.
  It maps any scalar SMS result from one selected scenario and run, including
  water depth, WSE, velocity magnitude, Froude number, and shear stress. Legend
  bounds are data-driven and remain editable; color ramps, contour interval,
  contour color/width, overlays, frame, report elements, project files, and PNG
  export are supported. Its Figure Set view expands selected scenarios, runs,
  and results into a bounded preview queue for batch review. Its Document view
  assembles included figures into ordered, captioned Letter pages, previews
  portrait or landscape output, and exports a client-side Word document.
- **Hydraulic Profiles & Sections** converts SMS Summary Table and Profile
  Values clipboard exports into report-ready cross sections. It detects the
  datasets-per-section block size independently from line meaning, then lets
  the engineer classify and name any number of Ground, WSE, and Other lines,
  select the station-matching reference, and choose ground/WSE relationships
  for earth fill and inundation shading.

The FRA WSE Difference workspace:

- Detects Natural, Existing, Proposed, and consistently named alternative
  geometry/datasets H5 pairs by contents and filenames.
- Assigns any loaded scenario to Baseline, Comparison, and assessment-source
  roles, with independently selectable runs.
- Calculates Comparison minus Baseline WSE where both scenarios have results.
- Classifies WSE differences to match the legend and outlines each class boundary.
- Generates reusable assessment-source WSE lines at whole-foot or half-foot
  elevation intervals, independently styled from difference boundaries.
- Filters and stations assessment lines against an imported hydraulic
  centerline, with explicit review for ambiguous crossings.
- Generates model-CRS centerline station ticks with independent minor, major,
  and label intervals; range, side, format, endpoint, and direction controls;
  plus draggable, editable, individually hideable labels.
- Labels included assessment lines with their WSE, with global and per-line
  visibility plus draggable, leader-anchored positions.
- Classifies newly inundated and newly dry areas using a configurable dry-depth
  threshold.
- Reads zipped shapefile overlays.
- Exposes report-frame, legend, color, title, map-view, and figure-element
  controls.
- Exports a report-resolution PNG.

## Architecture

```text
src/
  application/         File, persistence, hydraulic, figure-queue, and document use cases
  components/          Reusable workspace controls and project workflow views
    project-data/      Models, Layers, Assess, and Review navigation
  core/
    contracts/         Hydraulic, overlay, annotation, stationing, and figure types
    hydraulics/        SMS H5 readers, projection, scenario, scalar, WSE, and extrema services
    map/               Reusable render layers, elements, transforms, and interactions
    projectFiles/      Versioned schema, migration, validation, and serialization
    stationing/        Centerline extraction, ticks, and assessment stationing
    hydraulicEngine.ts Stable stateful facade over hydraulic services
    assessmentLines.ts Existing WSE contour generation and polyline stitching
    centerlineStationing.ts Stable stationing facade
    meshMatching.ts    Exact spatial matching and mesh-spacing tolerance
    mapRenderer.ts     Canvas layer orchestration and report elements
    projectFile.ts     Stable project persistence facade
    shapefile.ts       Zipped shapefile ingestion
    types.ts           Compatibility facade for partitioned contracts
  features/
    annotations/       Reusable annotation capabilities and collection commands
    assessment-lines/  Stationing controls, bounded review state, and interface
    figures/           Figure, tool, settings-section, and workspace contracts
    figure-sets/       Shared Figure / Figure Set / Document navigation
    project-document/  Shared project state independent of figure documents
    project-session/   H5 scenario catalog, role, run, and resource ownership
    stationing/        Centerline station figure-element controls
    plan-view-results/ Scalar workspace, batch recipe, review, persistence, and export
    tools/             Reusable editor-tool module contract
    wse-difference/    WSE workspace composition, controllers, panels, and export
  infrastructure/      Browser downloads, Word generation, and shapefile gateways
  App.tsx              Figure workspace host
```

The `core` modules are intentionally independent of the React interface so
future FRA, Appendix H, and Appendix K figure modules can share the same data
and rendering contracts. Facade files preserve established imports while
implementation ownership stays in focused directories. See
[Architecture](docs/ARCHITECTURE.md),
[Hydraulic contract](docs/HYDRAULIC-CONTRACT.md), and
[Testing](docs/TESTING.md) before extending those contracts.

## Development

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

Run the checked-in regression suite, build, and lint:

```bash
npm test
npm run build
npm run lint
npm run check:architecture
npm run test:e2e
```

The optional Site 6 integration test reads data from a local directory and
validates WSE comparison, cross-section, all supported scalar plan-view
results, and the 40-item Existing/Proposed Site 6 figure-set matrix. It writes
rendered PNGs to the temporary directory:

```powershell
$env:HFG_SITE6_DATA = "C:\path\to\Data h5 and shapefiles"
npm run test:site6
```

An additional real-file acceptance test verifies Existing-to-Natural pairing:

```powershell
$env:HFG_NATURAL_DATA = "C:\path\to\Existing and Natural H5 files"
npm run test:natural
```

GitHub Pages deploys automatically from `main`.
The Pages workflow requires lint, unit/component regression tests, the
production build, and Chromium smoke tests to pass before deployment.
